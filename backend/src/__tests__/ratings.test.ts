// Set JWT_SECRET before any imports
process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express from 'express';
import eventRatingsRouter from '../routes/eventRatings';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    eventRating: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ticket: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/event-ratings', eventRatingsRouter);

describe('Event Ratings Routes', () => {
  const userToken = jwt.sign({ userId: 'user-1' }, 'test-secret-key');

  const mockUser = {
    id: 'user-1',
    email: 'user@ieseg.fr',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: false,
  };

  const mockEvent = {
    id: 'event-1',
    name: 'Soirée BDE',
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Event passé
    rating: null,
    ratingCount: 0,
  };

  const mockTicket = {
    id: 'ticket-1',
    userId: 'user-1',
    eventId: 'event-1',
    status: 'VALID',
  };

  const mockRating = {
    id: 'rating-1',
    userId: 'user-1',
    eventId: 'event-1',
    rating: 4,
    comment: 'Excellente soirée !',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /event-ratings', () => {
    it('should create a rating for a past event with valid ticket', async () => {
      const newRating = {
        eventId: 'event-1',
        rating: 5,
        comment: 'Super événement',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(mockTicket);
      (prisma.eventRating.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.eventRating.create as jest.Mock).mockResolvedValue({
        id: 'rating-new',
        userId: 'user-1',
        ...newRating,
      });
      (prisma.eventRating.findMany as jest.Mock).mockResolvedValue([{
        id: 'rating-new',
        userId: 'user-1',
        ...newRating,
      }]);
      (prisma.event.update as jest.Mock).mockResolvedValue(mockEvent);

      const response = await request(app)
        .post('/event-ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newRating);

      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(5);
      expect(response.body.comment).toBe('Super événement');
      expect(prisma.eventRating.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          eventId: 'event-1',
          rating: 5,
          comment: 'Super événement',
        },
      });
    });

    it('should reject rating if user has no ticket', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/event-ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1', rating: 5 });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('billet');
    });

    it('should reject rating if event is not finished', async () => {
      const futureEvent = {
        ...mockEvent,
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Event futur
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(futureEvent);

      const response = await request(app)
        .post('/event-ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1', rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('terminé');
    });

    it('should update rating if user already rated the event', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(mockTicket);
      (prisma.eventRating.findUnique as jest.Mock).mockResolvedValue(mockRating);
      (prisma.eventRating.update as jest.Mock).mockResolvedValue({
        ...mockRating,
        rating: 5,
      });
      (prisma.eventRating.findMany as jest.Mock).mockResolvedValue([{
        ...mockRating,
        rating: 5,
      }]);
      (prisma.event.update as jest.Mock).mockResolvedValue(mockEvent);

      const response = await request(app)
        .post('/event-ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1', rating: 5 });

      expect(response.status).toBe(200);
      expect(prisma.eventRating.update).toHaveBeenCalled();
    });

    it('should validate rating is between 0 and 5', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(mockTicket);

      // Rating > 5
      const response1 = await request(app)
        .post('/event-ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1', rating: 6 });

      expect(response1.status).toBe(400);

      // Rating < 0
      const response2 = await request(app)
        .post('/event-ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1', rating: -1 });

      expect(response2.status).toBe(400);
    });

    it('should update event average rating after creation', async () => {
      const existingRatings = [
        { rating: 4 },
        { rating: 5 },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.event.update as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(mockTicket);
      (prisma.eventRating.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.eventRating.create as jest.Mock).mockResolvedValue({
        id: 'rating-new',
        userId: 'user-1',
        eventId: 'event-1',
        rating: 5,
      });
      (prisma.eventRating.findMany as jest.Mock).mockResolvedValue([
        ...existingRatings,
        { rating: 5 },
      ]);

      await request(app)
        .post('/event-ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1', rating: 5 });

      // Average should be (4 + 5 + 5) / 3 = 4.67
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          rating: expect.closeTo(4.67, 2),
          ratingCount: 3,
        },
      });
    });
  });

  describe('GET /event-ratings/:eventId', () => {
    it('should return all ratings for an event', async () => {
      const ratings = [mockRating];

      (prisma.eventRating.findMany as jest.Mock).mockResolvedValue(ratings);

      const response = await request(app)
        .get('/event-ratings/event-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].rating).toBe(4);
      expect(prisma.eventRating.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('GET /event-ratings/:eventId/my-rating', () => {
    it('should return user own rating', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.eventRating.findUnique as jest.Mock).mockResolvedValue(mockRating);

      const response = await request(app)
        .get('/event-ratings/event-1/my-rating')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      expect(response.body.comment).toBe('Excellente soirée !');
    });

    it('should return 404 if user has not rated', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.eventRating.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/event-ratings/event-1/my-rating')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /event-ratings/:eventId', () => {
    it('should delete user own rating', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.eventRating.delete as jest.Mock).mockResolvedValue(mockRating);
      (prisma.eventRating.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.event.update as jest.Mock).mockResolvedValue(mockEvent);

      const response = await request(app)
        .delete('/event-ratings/event-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(prisma.eventRating.delete).toHaveBeenCalledWith({
        where: {
          eventId_userId: {
            eventId: 'event-1',
            userId: 'user-1',
          },
        },
      });
    });
  });
});

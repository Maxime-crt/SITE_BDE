// Set JWT_SECRET before any imports
process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import eventsRouter from '../routes/events';
import { prisma } from '../utils/prisma';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ticket: {
      deleteMany: jest.fn(),
    },
    eventRating: {
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

const app = express();
app.use(express.json());
app.use('/events', eventsRouter);

describe('Events Routes', () => {
  const adminToken = jwt.sign({ userId: 'admin-1' }, 'test-secret-key');
  const userToken = jwt.sign({ userId: 'user-1' }, 'test-secret-key');

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@ieseg.fr',
    isAdmin: true,
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@ieseg.fr',
    isAdmin: false,
  };

  const mockEvent = {
    id: 'event-1',
    name: 'Soirée BDE',
    description: 'Grande soirée étudiante',
    location: 'Paris',
    type: 'PARTY',
    startDate: new Date('2025-03-01T20:00:00Z'),
    endDate: new Date('2025-03-02T02:00:00Z'),
    capacity: 100,
    ticketPrice: 15,
    publishedAt: new Date(),
    rating: null,
    ratingCount: 0,
    tickets: [],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /events', () => {
    it('should return all published events for regular users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent]);

      const response = await request(app)
        .get('/events')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Soirée BDE');
    });

    it('should return all events (including unpublished) for admins', async () => {
      const unpublishedEvent = { ...mockEvent, id: 'event-2', publishedAt: null };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([mockEvent, unpublishedEvent]);

      const response = await request(app)
        .get('/events')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /events/:id', () => {
    it('should return event by id', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);

      const response = await request(app)
        .get('/events/event-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('event-1');
      expect(response.body.name).toBe('Soirée BDE');
    });

    it('should return 404 if event not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/events/nonexistent')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('introuvable');
    });
  });

  describe('POST /events', () => {
    const newEventData = {
      name: 'Nouveau Event',
      description: 'Description test',
      location: 'Lyon',
      type: 'SPORT',
      startDate: '2025-04-01T10:00:00Z',
      endDate: '2025-04-01T18:00:00Z',
      capacity: 50,
      ticketPrice: 10,
    };

    it('should create event as admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-new',
        ...newEventData,
        publishedAt: new Date(),
      });

      const response = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEventData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Nouveau Event');
      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Nouveau Event',
            location: 'Lyon',
            capacity: 50,
          }),
        })
      );
    });

    it('should reject event creation for non-admin users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newEventData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('admin');
    });

    it('should validate required fields', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);

      const response = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /events/:id', () => {
    const updateData = {
      name: 'Soirée BDE Modifiée',
      capacity: 150,
      ticketPrice: 20,
    };

    it('should update event as admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.event.update as jest.Mock).mockResolvedValue({
        ...mockEvent,
        ...updateData,
      });

      const response = await request(app)
        .put('/events/event-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Soirée BDE Modifiée');
      expect(response.body.capacity).toBe(150);
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining(updateData),
      });
    });

    it('should reject update for non-admin users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/events/event-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('admin');
    });

    it('should return 404 if event does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/events/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /events/:id', () => {
    it('should delete event as admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.event.delete as jest.Mock).mockResolvedValue(mockEvent);

      const response = await request(app)
        .delete('/events/event-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('supprimé');
      expect(prisma.event.delete).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
    });

    it('should reject deletion for non-admin users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .delete('/events/event-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('admin');
    });

    it('should return 404 if event does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/events/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

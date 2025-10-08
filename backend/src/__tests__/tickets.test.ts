// Set JWT_SECRET before any imports
process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express from 'express';
import ticketsRouter from '../routes/tickets';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        client_secret: 'pi_test123_secret_test',
      }),
      retrieve: jest.fn(),
    },
  }));
});

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockqrcode')),
}));

const app = express();
app.use(express.json());
app.use('/tickets', ticketsRouter);

describe('Tickets Routes', () => {
  const adminToken = jwt.sign({ userId: 'admin-1' }, 'test-secret-key');
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
    location: 'Paris',
    startDate: new Date('2025-03-01T20:00:00Z'),
    endDate: new Date('2025-03-02T02:00:00Z'),
    capacity: 100,
    ticketPrice: 15,
    tickets: [],
  };

  const mockTicket = {
    id: 'ticket-1',
    userId: 'user-1',
    eventId: 'event-1',
    qrCode: 'unique-qr-code',
    status: 'VALID',
    purchasePrice: 15,
    purchasedAt: new Date(),
    usedAt: null,
    event: mockEvent,
    user: mockUser,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /tickets/my-tickets', () => {
    it('should return user tickets with QR code images', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([mockTicket]);

      const response = await request(app)
        .get('/tickets/my-tickets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('ticket-1');
      expect(response.body[0].qrCodeImage).toBeDefined();
      expect(response.body[0].status).toBe('VALID');
    });

    it('should return empty array if user has no tickets', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/tickets/my-tickets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('POST /tickets/create-payment-intent', () => {
    it('should create payment intent for ticket purchase', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);
      (prisma.ticket.create as jest.Mock).mockResolvedValue(mockTicket);

      const response = await request(app)
        .post('/tickets/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1' });

      expect(response.status).toBe(200);
      expect(response.body.clientSecret).toBeDefined();
      expect(response.body.ticketId).toBeDefined();
      expect(prisma.ticket.create).toHaveBeenCalled();
    });

    it('should reject if event does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/tickets/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'nonexistent' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Événement introuvable');
    });

    it('should reject if event is full', async () => {
      const fullEvent = {
        ...mockEvent,
        capacity: 2,
        tickets: [
          { id: 't1', status: 'VALID' },
          { id: 't2', status: 'VALID' },
        ],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(fullEvent);

      const response = await request(app)
        .post('/tickets/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('complet');
    });

    it('should reject if user already has a ticket', async () => {
      const eventWithUserTicket = {
        ...mockEvent,
        tickets: [{ id: 't1', userId: 'user-1', status: 'VALID' }],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(eventWithUserTicket);

      const response = await request(app)
        .post('/tickets/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: 'event-1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('déjà un billet');
    });
  });

  describe('POST /tickets/validate/:ticketId', () => {
    const mockAdmin = {
      id: 'admin-1',
      email: 'admin@ieseg.fr',
      isAdmin: true,
    };

    it('should validate ticket as admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket);
      (prisma.ticket.update as jest.Mock).mockResolvedValue({
        ...mockTicket,
        status: 'USED',
        usedAt: new Date(),
      });

      const response = await request(app)
        .post('/tickets/validate/ticket-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('validé');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: {
          status: 'USED',
          usedAt: expect.any(Date),
        },
      });
    });

    it('should reject validation for non-admin users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/tickets/validate/ticket-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('admin');
    });

    it('should reject if ticket already used', async () => {
      const usedTicket = {
        ...mockTicket,
        status: 'USED',
        usedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(usedTicket);

      const response = await request(app)
        .post('/tickets/validate/ticket-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('déjà été utilisé');
    });

    it('should return 404 if ticket not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/tickets/validate/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

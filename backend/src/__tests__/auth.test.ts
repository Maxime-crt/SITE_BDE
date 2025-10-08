import request from 'supertest';
import express from 'express';
import authRouter from '../routes/auth';
import { prisma } from '../utils/prisma';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock email service
jest.mock('../utils/email', () => ({
  generateVerificationCode: jest.fn(() => '123456'),
  sendVerificationEmail: jest.fn(() => Promise.resolve()),
}));

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user with @ieseg.fr email', async () => {
      const mockUser = {
        id: '1',
        email: 'test@ieseg.fr',
        firstName: 'John',
        lastName: 'Doe',
        phone: '0612345678',
        isAdmin: false,
        emailVerified: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@ieseg.fr',
          firstName: 'John',
          lastName: 'Doe',
          phone: '0612345678',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@ieseg.fr');
      expect(response.body.requiresVerification).toBe(true);
    });

    it('should reject non-@ieseg.fr email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@gmail.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '0612345678',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('@ieseg.fr');
    });

    it('should reject email with + character', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test+alias@ieseg.fr',
          firstName: 'John',
          lastName: 'Doe',
          phone: '0612345678',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('+');
    });

    it('should reject if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@ieseg.fr',
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@ieseg.fr',
          firstName: 'John',
          lastName: 'Doe',
          phone: '0612345678',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('existe déjà');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email with correct code', async () => {
      const mockUser = {
        id: '1',
        email: 'test@ieseg.fr',
        emailVerified: false,
        verificationCode: '123456',
        codeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      const updatedUser = {
        ...mockUser,
        emailVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          email: 'test@ieseg.fr',
          code: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('vérifié');
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid verification code', async () => {
      const mockUser = {
        id: '1',
        email: 'test@ieseg.fr',
        emailVerified: false,
        verificationCode: '123456',
        codeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          email: 'test@ieseg.fr',
          code: '654321',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('invalide');
    });

    it('should reject expired verification code', async () => {
      const mockUser = {
        id: '1',
        email: 'test@ieseg.fr',
        emailVerified: false,
        verificationCode: '123456',
        codeExpiresAt: new Date(Date.now() - 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          email: 'test@ieseg.fr',
          code: '123456',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('expiré');
    });
  });
});

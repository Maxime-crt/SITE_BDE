// Set JWT_SECRET before any imports
process.env.JWT_SECRET = 'test-secret-key';

import request from 'supertest';
import express from 'express';
import supportRouter from '../routes/support';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    supportMessage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/support', supportRouter);

describe('Support Routes', () => {
  const adminToken = jwt.sign({ userId: 'admin-1' }, 'test-secret-key');
  const userToken = jwt.sign({ userId: 'user-1' }, 'test-secret-key');

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@ieseg.fr',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@ieseg.fr',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: false,
  };

  const mockMessage = {
    id: 'msg-1',
    userId: 'user-1',
    message: 'J\'ai un problème avec mon billet',
    isFromBDE: false,
    isRead: false,
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  };

  const mockReply = {
    id: 'msg-2',
    userId: 'user-1',
    message: 'Bonjour, nous allons vous aider',
    isFromBDE: true,
    isRead: false,
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockAdmin,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /support/messages', () => {
    it('should return user messages', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      const response = await request(app)
        .get('/support/messages')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].message).toBe('J\'ai un problème avec mon billet');
      expect(prisma.supportMessage.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
        include: { user: expect.any(Object) },
      });
    });

    it('should mark messages as read when fetched', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.findMany as jest.Mock).mockResolvedValue([mockMessage, mockReply]);
      (prisma.supportMessage.update as jest.Mock).mockResolvedValue({ ...mockReply, isRead: true });

      await request(app)
        .get('/support/messages')
        .set('Authorization', `Bearer ${userToken}`);

      // Should mark BDE messages as read
      expect(prisma.supportMessage.update).toHaveBeenCalled();
    });
  });

  describe('POST /support/messages', () => {
    it('should create a new support message', async () => {
      const newMessage = { message: 'Aide nécessaire' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.create as jest.Mock).mockResolvedValue({
        id: 'msg-new',
        userId: 'user-1',
        ...newMessage,
        isFromBDE: false,
        isRead: false,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/support/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newMessage);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Aide nécessaire');
      expect(prisma.supportMessage.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          message: 'Aide nécessaire',
          isFromBDE: false,
        },
        include: { user: expect.any(Object) },
      });
    });

    it('should reject empty messages', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/support/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /support/messages/:id', () => {
    it('should update user own message', async () => {
      const updatedMessage = { message: 'Message modifié' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.findFirst as jest.Mock).mockResolvedValue({ ...mockMessage, editCount: 0 });
      (prisma.supportMessage.update as jest.Mock).mockResolvedValue({
        ...mockMessage,
        ...updatedMessage,
        isEdited: true,
        editCount: 1,
      });

      const response = await request(app)
        .put('/support/messages/msg-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedMessage);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message modifié');
      expect(response.body.isEdited).toBe(true);
    });

    it('should reject updating another user message', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/support/messages/msg-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Tentative de modification' });

      expect(response.status).toBe(404);
    });

    it('should return 404 if message not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/support/messages/nonexistent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ message: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /support/messages/:id', () => {
    it('should delete user own message', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.findFirst as jest.Mock).mockResolvedValue(mockMessage);
      (prisma.supportMessage.delete as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .delete('/support/messages/msg-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('supprimé');
      expect(prisma.supportMessage.delete).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
      });
    });

    it('should reject deleting another user message', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      (prisma.supportMessage.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/support/messages/msg-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Admin Support Routes', () => {
    describe('GET /support/admin/all-conversations', () => {
      it('should return all conversations for admin', async () => {
        const usersWithMessages = [
          {
            ...mockUser,
            supportMessages: [mockMessage],
          },
        ];

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
        (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
        (prisma.user.findMany as jest.Mock).mockResolvedValue(usersWithMessages);

        const response = await request(app)
          .get('/support/admin/all-conversations')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].supportMessages).toBeDefined();
      });

      it('should reject for non-admin users', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

        const response = await request(app)
          .get('/support/admin/all-conversations')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Admin');
      });
    });

    describe('GET /support/admin/user/:userId/messages', () => {
      it('should return messages for specific user as admin', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
        (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
        (prisma.supportMessage.findMany as jest.Mock).mockResolvedValue([mockMessage, mockReply]);

        const response = await request(app)
          .get('/support/admin/user/user-1/messages')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(prisma.supportMessage.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true, isAdmin: true }
            },
            replyTo: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, isAdmin: true }
                }
              }
            }
          },
        });
      });

      it('should reject for non-admin users', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

        const response = await request(app)
          .get('/support/admin/user/user-1/messages')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('POST /support/admin/reply', () => {
      it('should send reply as admin', async () => {
        const replyData = {
          userId: 'user-1',
          message: 'Nous pouvons vous aider',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
        (prisma.user.update as jest.Mock).mockResolvedValue(mockAdmin);
        (prisma.supportMessage.create as jest.Mock).mockResolvedValue(mockReply);

        const response = await request(app)
          .post('/support/admin/reply')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(replyData);

        expect(response.status).toBe(201);
        expect(response.body.isFromBDE).toBe(true);
        expect(prisma.supportMessage.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            message: 'Nous pouvons vous aider',
            replyToId: null,
            isFromBDE: true,
          },
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true, isAdmin: true }
            },
            replyTo: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, isAdmin: true }
                }
              }
            }
          },
        });
      });

      it('should reject for non-admin users', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

        const response = await request(app)
          .post('/support/admin/reply')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userId: 'user-1', message: 'Test' });

        expect(response.status).toBe(403);
      });
    });
  });
});

// Set JWT_SECRET before importing modules
process.env.JWT_SECRET = 'test-secret-key';

import { Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { verifyToken } from '../utils/jwt';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock JWT utils
jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

describe('authenticateToken Middleware', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when no Authorization header is provided', async () => {
    await authenticateToken(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token d'accès requis" });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not found in database', async () => {
    req.headers = { authorization: 'Bearer valid-token-123' };

    (verifyToken as jest.Mock).mockReturnValue({ userId: 'nonexistent-user' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await authenticateToken(req as AuthRequest, res as Response, next);

    expect(verifyToken).toHaveBeenCalledWith('valid-token-123');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'nonexistent-user' },
      select: expect.objectContaining({ id: true, email: true }),
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Utilisateur non trouvé' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when token is invalid or expired', async () => {
    req.headers = { authorization: 'Bearer invalid-token' };

    (verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await authenticateToken(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() and attach user when token is valid', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@ieseg.fr',
      firstName: 'John',
      lastName: 'Doe',
      phone: '0612345678',
      isAdmin: false,
      gender: 'MALE',
      homeAddress: null,
      homeCity: null,
      homePostcode: null,
      homeLatitude: null,
      homeLongitude: null,
      instagram: null,
      charterAcceptedAt: null,
    };

    req.headers = { authorization: 'Bearer valid-token-123' };

    (verifyToken as jest.Mock).mockReturnValue({ userId: 'user-123' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    await authenticateToken(req as AuthRequest, res as Response, next);

    expect(verifyToken).toHaveBeenCalledWith('valid-token-123');
    expect(req.userId).toBe('user-123');
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

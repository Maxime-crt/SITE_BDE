// Set JWT_SECRET before importing modules
process.env.JWT_SECRET = 'test-secret-key';

import { generateToken, verifyToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';

describe('JWT Utilities', () => {
  const testUserId = 'test-user-123';

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testUserId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-secret-key') as any;
      expect(decoded.userId).toBe(testUserId);
    });

    it('should generate tokens that expire in 7 days', () => {
      const token = generateToken(testUserId);
      const decoded = jwt.verify(token, 'test-secret-key') as any;

      const expiresIn = decoded.exp - decoded.iat;
      expect(expiresIn).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testUserId);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect((decoded as any).userId).toBe(testUserId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId },
        'test-secret-key',
        { expiresIn: '-1s' }
      );

      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });
});

// Mock Resend avant l'import
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'mock-email-id' }),
      },
    })),
  };
});

import { generateVerificationCode } from '../utils/email';

describe('Email Utilities', () => {
  describe('generateVerificationCode', () => {
    it('should generate a 6-digit code', () => {
      const code = generateVerificationCode();

      expect(code).toBeDefined();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes on multiple calls', () => {
      const codes = new Set();

      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }

      // Should have at least 90 unique codes out of 100 (allowing for some collisions)
      expect(codes.size).toBeGreaterThan(90);
    });

    it('should generate codes between 000000 and 999999', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateVerificationCode();
        const numericCode = parseInt(code, 10);

        expect(numericCode).toBeGreaterThanOrEqual(0);
        expect(numericCode).toBeLessThanOrEqual(999999);
      }
    });
  });
});

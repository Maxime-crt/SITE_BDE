import { describe, it, expect } from 'vitest';
import { parisLocalToUTC, utcToParisLocal, formatParisDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('parisLocalToUTC', () => {
    it('should convert Paris local time to UTC ISO string', () => {
      // Paris is UTC+1 in winter (CET)
      const result = parisLocalToUTC('2026-01-15T12:00');
      // 12:00 Paris winter time = 11:00 UTC
      expect(result).toBe('2026-01-15T11:00:00.000Z');
    });

    it('should handle DST (summer time, UTC+2)', () => {
      // Paris is UTC+2 in summer (CEST)
      const result = parisLocalToUTC('2026-07-15T14:00');
      // 14:00 Paris summer time = 12:00 UTC
      expect(result).toBe('2026-07-15T12:00:00.000Z');
    });

    it('should return a valid ISO string', () => {
      const result = parisLocalToUTC('2026-03-20T09:30');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('utcToParisLocal', () => {
    it('should convert UTC to Paris local datetime-local format', () => {
      // 11:00 UTC in winter = 12:00 Paris
      const result = utcToParisLocal('2026-01-15T11:00:00.000Z');
      expect(result).toBe('2026-01-15T12:00');
    });

    it('should handle DST (summer time)', () => {
      // 12:00 UTC in summer = 14:00 Paris
      const result = utcToParisLocal('2026-07-15T12:00:00.000Z');
      expect(result).toBe('2026-07-15T14:00');
    });

    it('should return format YYYY-MM-DDTHH:mm', () => {
      const result = utcToParisLocal('2026-06-01T08:30:00.000Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('formatParisDate', () => {
    it('should format date in French locale', () => {
      const result = formatParisDate('2026-01-15T11:00:00.000Z');
      // French locale should contain date components
      expect(result).toBeTruthy();
      // Should contain "15" (day) somewhere in the output
      expect(result).toContain('15');
    });

    it('should accept Intl.DateTimeFormatOptions', () => {
      const result = formatParisDate('2026-06-15T10:00:00.000Z', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      // French month name for June
      expect(result).toContain('juin');
      expect(result).toContain('2026');
    });

    it('should display time in Paris timezone', () => {
      // 10:00 UTC in summer = 12:00 Paris
      const result = formatParisDate('2026-06-15T10:00:00.000Z', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(result).toContain('12');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

import toast from 'react-hot-toast';
import { handleApiError, handleApiErrorWithLog } from '../errorHandler';

describe('errorHandler', () => {
  const mockToastError = toast.error as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('should skip auth errors (isAuthError flag)', () => {
      const error = { isAuthError: true };

      handleApiError(error, 'Fallback message');

      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('should show toast with API error message', () => {
      const error = {
        response: { data: { error: 'Email already exists' } },
      };

      handleApiError(error, 'Fallback message');

      expect(mockToastError).toHaveBeenCalledWith('Email already exists');
    });

    it('should show fallback message when no API error', () => {
      const error = {};

      handleApiError(error, 'Something went wrong');

      expect(mockToastError).toHaveBeenCalledWith('Something went wrong');
    });

    it('should show fallback when response has no error field', () => {
      const error = { response: { data: {} } };

      handleApiError(error, 'Default error');

      expect(mockToastError).toHaveBeenCalledWith('Default error');
    });
  });

  describe('handleApiErrorWithLog', () => {
    it('should skip auth errors (isAuthError flag)', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = { isAuthError: true };

      handleApiErrorWithLog(error, 'Fallback message', 'TestContext');

      expect(mockToastError).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show toast with API error message and log with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = {
        response: { data: { error: 'Server error' } },
      };

      handleApiErrorWithLog(error, 'Fallback', 'LoadEvents');

      expect(mockToastError).toHaveBeenCalledWith('Server error');
      expect(consoleSpy).toHaveBeenCalledWith('LoadEvents:', error);
      consoleSpy.mockRestore();
    });

    it('should show fallback message when no API error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = {};

      handleApiErrorWithLog(error, 'Operation failed');

      expect(mockToastError).toHaveBeenCalledWith('Operation failed');
      consoleSpy.mockRestore();
    });

    it('should log with default context when none provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = { response: { data: { error: 'Not found' } } };

      handleApiErrorWithLog(error, 'Fallback');

      expect(consoleSpy).toHaveBeenCalledWith('Erreur API:', error);
      consoleSpy.mockRestore();
    });
  });
});

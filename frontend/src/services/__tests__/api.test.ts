import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock hoisting, so the variable is available
const mockAxiosInstance = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
  __esModule: true,
}));

// Now import the module under test — it will use our mocked axios
import { authApi, eventsApi, ticketsApi } from '../api';

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('authApi', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@ieseg.fr', firstName: 'John' },
          token: 'mock-token',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.login({
        email: 'test@ieseg.fr',
        password: 'password123',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@ieseg.fr',
        password: 'password123',
      });
      expect(result.user.email).toBe('test@ieseg.fr');
      expect(result.token).toBe('mock-token');
    });

    it('should register successfully', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            email: 'test@ieseg.fr',
            firstName: 'John',
            lastName: 'Doe',
          },
          requiresVerification: true,
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await authApi.register({
        email: 'test@ieseg.fr',
        firstName: 'John',
        lastName: 'Doe',
        phone: '0612345678',
        password: 'password123',
      });

      expect(result.requiresVerification).toBe(true);
    });

    it('should verify email successfully', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@ieseg.fr', emailVerified: true },
          token: 'mock-token',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // verifyEmail takes (email, code) as separate arguments
      const result = await authApi.verifyEmail('test@ieseg.fr', '123456');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/verify-email', {
        email: 'test@ieseg.fr',
        code: '123456',
      });
      expect(result.user.emailVerified).toBe(true);
      expect(result.token).toBeDefined();
    });
  });

  describe('eventsApi', () => {
    it('should fetch all events', async () => {
      const mockEvents = [
        {
          id: '1',
          name: 'Test Event',
          location: 'Paris',
          startDate: '2025-01-01',
          endDate: '2025-01-02',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: mockEvents });

      const result = await eventsApi.getAll();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/events');
      expect(result).toEqual(mockEvents);
    });

    it('should fetch event by id', async () => {
      const mockEvent = {
        id: '1',
        name: 'Test Event',
        location: 'Paris',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockEvent });

      const result = await eventsApi.getById('1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/events/1');
      expect(result.name).toBe('Test Event');
    });

    it('should create a new event', async () => {
      const newEvent = {
        name: 'New Event',
        description: 'Test description',
        location: 'Lyon',
        type: 'PARTY',
        startDate: '2025-02-01',
        endDate: '2025-02-02',
        capacity: 100,
      };

      mockAxiosInstance.post.mockResolvedValue({ data: { id: '2', ...newEvent } });

      const result = await eventsApi.create(newEvent);

      // create uses FormData and multipart/form-data header
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/events',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result.id).toBe('2');
    });

    it('should delete an event', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      await eventsApi.delete('1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/events/1');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { authApi, eventsApi, ticketsApi } from '../api';

vi.mock('axios');
const mockedAxios = axios as any;

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

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await authApi.login({
        email: 'test@ieseg.fr',
        password: 'password123',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
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

      mockedAxios.post.mockResolvedValue(mockResponse);

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

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await authApi.verifyEmail({
        email: 'test@ieseg.fr',
        code: '123456',
      });

      expect(result.user.emailVerified).toBe(true);
      expect(result.token).toBeDefined();
    });
  });

  describe('eventsApi', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'mock-token');
    });

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

      mockedAxios.get.mockResolvedValue({ data: mockEvents });

      const result = await eventsApi.getAll();

      expect(mockedAxios.get).toHaveBeenCalledWith('/events', {
        headers: { Authorization: 'Bearer mock-token' },
      });
      expect(result).toEqual(mockEvents);
    });

    it('should fetch event by id', async () => {
      const mockEvent = {
        id: '1',
        name: 'Test Event',
        location: 'Paris',
      };

      mockedAxios.get.mockResolvedValue({ data: mockEvent });

      const result = await eventsApi.getById('1');

      expect(mockedAxios.get).toHaveBeenCalledWith('/events/1', {
        headers: { Authorization: 'Bearer mock-token' },
      });
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
        ticketPrice: 10,
      };

      mockedAxios.post.mockResolvedValue({ data: { id: '2', ...newEvent } });

      const result = await eventsApi.create(newEvent);

      expect(mockedAxios.post).toHaveBeenCalledWith('/events', newEvent, {
        headers: { Authorization: 'Bearer mock-token' },
      });
      expect(result.id).toBe('2');
    });

    it('should delete an event', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      await eventsApi.delete('1');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/events/1', {
        headers: { Authorization: 'Bearer mock-token' },
      });
    });
  });

  describe('ticketsApi', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'mock-token');
    });

    it('should fetch user tickets', async () => {
      const mockTickets = [
        {
          id: '1',
          qrCode: 'QR123',
          status: 'VALID',
          event: { id: '1', name: 'Test Event' },
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockTickets });

      const result = await ticketsApi.getMyTickets();

      expect(mockedAxios.get).toHaveBeenCalledWith('/tickets/my-tickets', {
        headers: { Authorization: 'Bearer mock-token' },
      });
      expect(result).toEqual(mockTickets);
    });

    it('should create payment intent', async () => {
      const mockResponse = {
        clientSecret: 'secret_123',
        ticketId: 'ticket_1',
      };

      mockedAxios.post.mockResolvedValue({ data: mockResponse });

      const result = await ticketsApi.createPaymentIntent('event_1');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/tickets/create-payment-intent',
        { eventId: 'event_1' },
        { headers: { Authorization: 'Bearer mock-token' } }
      );
      expect(result.clientSecret).toBe('secret_123');
    });
  });
});

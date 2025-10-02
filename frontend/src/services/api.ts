import axios from 'axios';
import type { User, Event, Ride, AuthResponse } from '../types';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'  // En production, l'API est servie par le même domaine
  : 'http://localhost:3001/api';  // En développement, API sur port 3001

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  verifyEmail: async (email: string, code: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/verify-email', { email, code });
    return response.data;
  },

  resendVerificationCode: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const eventsApi = {
  getAll: async (): Promise<Event[]> => {
    const response = await api.get('/events');
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    location: string;
    type: string;
    customType?: string;
    startDate: string;
    endDate: string;
    capacity: number;
    ticketPrice: number;
    publishedAt?: string;
  }): Promise<Event> => {
    const response = await api.post('/events', data);
    return response.data;
  },

  update: async (id: string, data: {
    name: string;
    description?: string;
    location: string;
    type: string;
    customType?: string;
    startDate: string;
    endDate: string;
    capacity?: number;
    ticketPrice?: number;
    publishedAt?: string | null;
  }): Promise<Event> => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  getTicketsAvailable: async (eventId: string): Promise<{ capacity: number; sold: number; available: number }> => {
    const response = await api.get(`/events/${eventId}/tickets-available`);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },
};

export const ticketsApi = {
  createPaymentIntent: async (eventId: string): Promise<{ clientSecret?: string; amount?: number; success?: boolean; isFree?: boolean; ticket?: any }> => {
    const response = await api.post('/tickets/create-payment-intent', { eventId });
    return response.data;
  },

  confirmPayment: async (paymentIntentId: string, eventId: string): Promise<{ ticket: any }> => {
    const response = await api.post('/tickets/confirm-payment', { paymentIntentId, eventId });
    return response.data;
  },

  getMyTickets: async (): Promise<any[]> => {
    const response = await api.get('/tickets/my-tickets');
    return response.data;
  },

  getTicket: async (ticketId: string): Promise<any> => {
    const response = await api.get(`/tickets/${ticketId}`);
    return response.data;
  },

  cancelTicket: async (ticketId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/tickets/${ticketId}/cancel`);
    return response.data;
  },

  scanTicket: async (ticketId: string): Promise<{ success: boolean; ticket: any }> => {
    const response = await api.post(`/tickets/${ticketId}/scan`);
    return response.data;
  },

  scanQRCode: async (qrCodeData: string): Promise<{ success: boolean; ticket: any }> => {
    const response = await api.post('/tickets/scan-qr', { qrCodeData });
    return response.data;
  },
};

export const eventRatingsApi = {
  create: async (data: {
    eventId: string;
    rating: number;
    comment?: string;
  }): Promise<any> => {
    const response = await api.post('/event-ratings', data);
    return response.data;
  },

  getByEvent: async (eventId: string): Promise<any[]> => {
    const response = await api.get(`/event-ratings/${eventId}`);
    return response.data;
  },

  getMyRating: async (eventId: string): Promise<any> => {
    const response = await api.get(`/event-ratings/${eventId}/my-rating`);
    return response.data;
  },

  delete: async (eventId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/event-ratings/${eventId}`);
    return response.data;
  },
};

export const supportApi = {
  getMessages: async (): Promise<any[]> => {
    const response = await api.get('/support/messages');
    return response.data;
  },

  sendMessage: async (data: {
    message: string;
    replyToId?: string;
  }): Promise<any> => {
    const response = await api.post('/support/messages', data);
    return response.data;
  },

  updateMessage: async (messageId: string, message: string): Promise<any> => {
    const response = await api.put(`/support/messages/${messageId}`, { message });
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/support/messages/${messageId}`);
    return response.data;
  },
};


export const adminApi = {
  getAllTickets: async () => {
    const response = await api.get('/events/admin/all-tickets');
    return response.data;
  },

  getAllMembers: async () => {
    const response = await api.get('/events/admin/members');
    return response.data;
  },

  getConnectionStats: async () => {
    const response = await api.get('/events/admin/connection-stats');
    return response.data;
  },

  getAllConversations: async () => {
    const response = await api.get('/support/admin/all-conversations');
    return response.data;
  },

  getUserMessages: async (userId: string) => {
    const response = await api.get(`/support/admin/user/${userId}/messages`);
    return response.data;
  },

  replyToUser: async (data: {
    userId: string;
    message: string;
    replyToId?: string;
  }) => {
    const response = await api.post('/support/admin/reply', data);
    return response.data;
  },
};

export default api;
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
    publishedAt?: string | null;
  }): Promise<Event> => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },
};

export const ridesApi = {
  getByEvent: async (eventId: string): Promise<Ride[]> => {
    const response = await api.get(`/events/${eventId}/rides`);
    return response.data;
  },

  getById: async (id: string): Promise<Ride> => {
    const response = await api.get(`/rides/${id}`);
    return response.data;
  },

  create: async (data: {
    eventId: string;
    destination: string;
    description?: string;
    departureTime: string;
    maxParticipants: number;
    cost?: number;
    transportType: 'DRIVE' | 'UBER';
  }): Promise<Ride> => {
    const response = await api.post('/rides', data);
    return response.data;
  },

  join: async (rideId: string) => {
    const response = await api.post(`/rides/${rideId}/join`);
    return response.data;
  },

  confirm: async (rideId: string) => {
    const response = await api.patch(`/rides/${rideId}/confirm`);
    return response.data;
  },

  setCost: async (rideId: string, cost: number) => {
    const response = await api.patch(`/rides/${rideId}/cost`, { cost });
    return response.data;
  },

  markReimbursed: async (rideId: string) => {
    const response = await api.patch(`/rides/${rideId}/reimburse`);
    return response.data;
  },

  update: async (rideId: string, data: {
    destination: string;
    description?: string;
    departureTime: string;
    maxParticipants: number;
    cost?: number;
    transportType?: 'DRIVE' | 'UBER';
  }): Promise<Ride> => {
    const response = await api.put(`/rides/${rideId}`, data);
    return response.data;
  },

  delete: async (rideId: string) => {
    const response = await api.delete(`/rides/${rideId}`);
    return response.data;
  },

  getMyRides: async () => {
    const response = await api.get('/rides/my-rides');
    return response.data;
  },

  manageParticipant: async (rideId: string, participantId: string, action: 'accept' | 'reject') => {
    const response = await api.patch(`/rides/${rideId}/participants/${participantId}`, { action });
    return response.data;
  },

  leave: async (rideId: string) => {
    const response = await api.delete(`/rides/${rideId}/leave`);
    return response.data;
  },
};

export const usersApi = {
  rate: async (userId: string, data: {
    rideId: string;
    rating: number;
    comment?: string;
  }) => {
    const response = await api.post(`/users/${userId}/rate`, data);
    return response.data;
  },

  getRides: async (userId: string) => {
    const response = await api.get(`/users/${userId}/rides`);
    return response.data;
  },
};

export const adminApi = {
  getAllGroups: async () => {
    const response = await api.get('/events/admin/all-groups');
    return response.data;
  },

  getAllMembers: async () => {
    const response = await api.get('/events/admin/members');
    return response.data;
  },

  removeUserFromRide: async (rideId: string, userId: string) => {
    const response = await api.delete(`/rides/admin/${rideId}/participants/${userId}`);
    return response.data;
  },

  getConnectionStats: async () => {
    const response = await api.get('/events/admin/connection-stats');
    return response.data;
  },
};

export default api;
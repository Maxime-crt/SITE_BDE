export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  rating: number | null;
  ratingCount: number;
  isAdmin?: boolean;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  location: string;
  type: string;
  customType?: string;
  startDate: string;
  endDate: string;
  publishedAt?: string;
  rides?: Ride[];
}

export interface Ride {
  id: string;
  eventId: string;
  creatorId: string;
  destination: string;
  departureTime: string;
  maxParticipants: number;
  cost?: number;
  transportType: 'DRIVE' | 'UBER';
  status: RideStatus;
  creator: User;
  participants: RideParticipant[];
  event?: Event;
}

export interface RideParticipant {
  id: string;
  rideId: string;
  userId: string;
  status: ParticipantStatus;
  hasReimbursed: boolean;
  joinedAt: string;
  user: User;
}

export type RideStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ParticipantStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
  errors?: Array<{ msg: string; param: string }>;
}
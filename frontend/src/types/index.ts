export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  isAdmin?: boolean;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY';
  homeAddress?: string;
  homeCity?: string;
  homePostcode?: string;
  homeLatitude?: number;
  homeLongitude?: number;
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
  capacity: number;
  rating?: number;
  ratingCount: number;
  publishedAt?: string;
  latitude?: number;
  longitude?: number;
  ratings?: EventRating[];
}

export interface EventRating {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  event?: Event;
  user?: User;
}

export interface SupportMessage {
  id: string;
  userId: string;
  message: string;
  isEdited: boolean;
  replyToId?: string;
  isFromBDE: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  replyTo?: SupportMessage;
  replies?: SupportMessage[];
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  requiresVerification?: boolean;
}

export interface ApiError {
  error: string;
  errors?: Array<{ msg: string; param: string }>;
}

// ========================================
// UBER SHARING TYPES
// ========================================

export interface UberRide {
  id: string;
  eventId: string;
  status: 'MATCHING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  departureTime: string;
  departNow: boolean;
  maxPassengers: number;
  currentPassengers: number;
  departureAddress: string;
  departureLat: number;
  departureLng: number;
  estimatedCost?: number;
  finalCost?: number;
  route?: any; // JSON
  routePolyline?: string;
  createdAt: string;
  updatedAt: string;
  event?: Event;
  requests?: UberRideRequest[];
  messages?: UberRideMessage[];
  payments?: UberRidePayment[];
}

export interface UberRideRequest {
  id: string;
  rideId: string;
  userId: string;
  eventId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  maxDepartureTime: string;
  destinationAddress: string;
  destinationCity: string;
  destinationPostcode: string;
  destinationLat: number;
  destinationLng: number;
  femaleOnly: boolean;
  isInitiator: boolean;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  ride?: UberRide;
  user?: User;
  event?: Event;
}

export interface UberRideMessage {
  id: string;
  rideId: string;
  userId: string;
  message: string;
  createdAt: string;
  user?: User;
}

export interface UberRidePayment {
  id: string;
  rideId: string;
  userId: string;
  amount: number;
  preAuthAmount?: number;
  status: 'PENDING' | 'PRE_AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED';
  stripePaymentId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'UBER_MATCH' | 'UBER_CONFIRMED' | 'UBER_CANCELLED' | 'UBER_PASSENGER_LEFT' |
        'UBER_MESSAGE' | 'PAYMENT_REQUEST' | 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED';
  title: string;
  message: string;
  rideId?: string;
  isRead: boolean;
  createdAt: string;
}
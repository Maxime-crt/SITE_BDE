export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
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
  capacity: number;
  ticketPrice: number;
  rating?: number;
  ratingCount: number;
  publishedAt?: string;
  userHasTicket?: boolean;
  tickets?: Ticket[];
  ratings?: EventRating[];
}

export interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  qrCode: string;
  status: TicketStatus;
  purchasePrice: number;
  stripePaymentId?: string;
  purchasedAt: string;
  usedAt?: string;
  event?: Event;
  user?: User;
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

export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED' | 'REFUNDED';

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
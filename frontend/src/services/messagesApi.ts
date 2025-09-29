import api from './api';

export interface RideMessage {
  id: string;
  rideId: string;
  userId: string;
  message: string;
  isEdited: boolean;
  replyToId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  replyTo?: {
    id: string;
    message: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export const messagesApi = {
  getRideMessages: (rideId: string): Promise<RideMessage[]> =>
    api.get(`/messages/ride/${rideId}`).then(res => res.data),

  sendRideMessage: (rideId: string, message: string, replyToId?: string): Promise<RideMessage> =>
    api.post(`/messages/ride/${rideId}`, { message, replyToId }).then(res => res.data),

  updateMessage: (messageId: string, message: string): Promise<RideMessage> =>
    api.put(`/messages/${messageId}`, { message }).then(res => res.data),

  deleteMessage: (messageId: string): Promise<void> =>
    api.delete(`/messages/${messageId}`).then(() => {})
};
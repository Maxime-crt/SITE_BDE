import api from './api';

export interface RideParticipant {
  id: string;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    rating?: number;
  };
}

export interface Ride {
  id: string;
  destination: string;
  description?: string;
  departureTime: string;
  maxParticipants: number;
  cost?: number;
  transportType: string;
  status: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    rating?: number;
    phone?: string;
  };
  participants: RideParticipant[];
  event: {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
  };
}

export const ridesApi = {
  getRideDetails: (rideId: string): Promise<Ride> =>
    api.get(`/rides/${rideId}`).then(res => res.data)
};
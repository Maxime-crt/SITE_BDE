import { findMatches } from '../services/uberMatchingService';
import { prisma } from '../utils/prisma';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    uberRideRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    uberRide: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock geocodingService
jest.mock('../services/geocodingService', () => ({
  areDestinationsClose: jest.fn(),
}));

// Mock routingService
jest.mock('../services/routingService', () => ({
  isDetourAcceptable: jest.fn(),
  optimizeWaypoints: jest.fn(),
}));

// Mock notificationService
jest.mock('../services/notificationService', () => ({
  notifyUberMatch: jest.fn(() => Promise.resolve()),
}));

// Mock uberPricingService
jest.mock('../services/uberPricingService', () => ({
  estimateUberPrice: jest.fn(() => ({
    perPersonEstimate: 10,
    totalEstimate: 20,
    totalDistance: 15,
  })),
}));

// Mock rideSocketService
jest.mock('../services/rideSocketService', () => ({
  notifyRideUpdated: jest.fn(),
}));

import { areDestinationsClose } from '../services/geocodingService';
import { isDetourAcceptable, optimizeWaypoints } from '../services/routingService';
import { notifyRideUpdated } from '../services/rideSocketService';

const now = new Date();
const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

function makeRequest(overrides: Record<string, any> = {}) {
  return {
    id: 'request-1',
    userId: 'user-1',
    eventId: 'event-1',
    rideId: 'ride-1',
    status: 'ACCEPTED',
    femaleOnly: false,
    maxDepartureTime: thirtyMinLater,
    destinationLat: 48.85,
    destinationLng: 2.35,
    destinationAddress: '10 Rue de Paris',
    user: {
      id: 'user-1',
      firstName: 'Alice',
      gender: 'FEMALE',
    },
    event: {
      id: 'event-1',
      latitude: 48.86,
      longitude: 2.34,
    },
    ride: {
      id: 'ride-1',
      status: 'MATCHING',
      currentPassengers: 1,
      maxPassengers: 4,
    },
    ...overrides,
  };
}

function makeOtherRequest(overrides: Record<string, any> = {}) {
  return {
    id: 'request-2',
    userId: 'user-2',
    eventId: 'event-1',
    rideId: 'ride-2',
    status: 'ACCEPTED',
    femaleOnly: false,
    maxDepartureTime: thirtyMinLater,
    destinationLat: 48.84,
    destinationLng: 2.36,
    destinationAddress: '20 Rue de Lyon',
    user: {
      id: 'user-2',
      firstName: 'Bob',
      gender: 'MALE',
    },
    ride: {
      id: 'ride-2',
      status: 'MATCHING',
      currentPassengers: 1,
      maxPassengers: 4,
      requests: [{ id: 'request-2', status: 'ACCEPTED' }],
    },
    ...overrides,
  };
}

describe('uberMatchingService - findMatches', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty when no compatible requests found', async () => {
    const request = makeRequest();

    (prisma.uberRideRequest.findUnique as jest.Mock).mockResolvedValue(request);
    (prisma.uberRideRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.uberRideRequest.findMany as jest.Mock).mockResolvedValue([]);

    const result = await findMatches('request-1');

    expect(result.matched).toBe(false);
    expect(result.message).toContain('Aucun trajet compatible');
  });

  it('should filter by time compatibility (±30 min window)', async () => {
    const request = makeRequest();

    (prisma.uberRideRequest.findUnique as jest.Mock).mockResolvedValue(request);
    (prisma.uberRideRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    // Prisma query includes the time filter; an empty result means no time-compatible requests
    (prisma.uberRideRequest.findMany as jest.Mock).mockResolvedValue([]);

    const result = await findMatches('request-1');

    // Verify the prisma query was called with time window filters
    expect(prisma.uberRideRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'event-1',
          status: 'ACCEPTED',
          maxDepartureTime: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );

    // Verify the time window bounds are within ±30 min
    const callArgs = (prisma.uberRideRequest.findMany as jest.Mock).mock.calls[0][0];
    const lte = callArgs.where.maxDepartureTime.lte.getTime();
    const requestTime = request.maxDepartureTime.getTime();
    expect(lte).toBe(requestTime + 30 * 60 * 1000);

    expect(result.matched).toBe(false);
  });

  it('should filter by gender preferences', async () => {
    // Request from a male user, other request requires femaleOnly
    const request = makeRequest({
      user: { id: 'user-1', firstName: 'Charlie', gender: 'MALE' },
      femaleOnly: false,
    });
    const otherRequest = makeOtherRequest({
      femaleOnly: true,
      user: { id: 'user-2', firstName: 'Diana', gender: 'FEMALE' },
    });

    (prisma.uberRideRequest.findUnique as jest.Mock).mockResolvedValue(request);
    (prisma.uberRideRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.uberRideRequest.findMany as jest.Mock).mockResolvedValue([otherRequest]);

    const result = await findMatches('request-1');

    // The other request requires femaleOnly but the requester is MALE, so filtered out
    expect(result.matched).toBe(false);
    expect(result.message).toContain('préférences');
  });

  it('should successfully match two compatible requests', async () => {
    const request = makeRequest();
    const otherRequest = makeOtherRequest();

    (prisma.uberRideRequest.findUnique as jest.Mock).mockResolvedValue(request);
    (prisma.uberRideRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.uberRideRequest.findMany as jest.Mock)
      .mockResolvedValueOnce([otherRequest]) // initial query
      .mockResolvedValueOnce([]); // allMembers query (not reached in this path)
    (areDestinationsClose as jest.Mock).mockReturnValue(true);
    (isDetourAcceptable as jest.Mock).mockResolvedValue(true);
    (prisma.uberRideRequest.update as jest.Mock).mockResolvedValue({});
    (prisma.uberRide.update as jest.Mock).mockResolvedValue({});
    (prisma.uberRide.findUnique as jest.Mock).mockResolvedValue({
      id: 'ride-2',
      requests: [{ id: 'request-2' }],
      departureLat: 48.86,
      departureLng: 2.34,
      currentPassengers: 2,
    });
    (optimizeWaypoints as jest.Mock).mockResolvedValue({
      waypoints: [],
      polyline: '',
      totalDistance: 5000,
      totalDuration: 600,
    });

    const result = await findMatches('request-1');

    expect(result.matched).toBe(true);
    expect(result.rideId).toBe('ride-2');
    expect(result.message).toContain('Match trouvé');

    // Verify the request was updated to join the other ride
    expect(prisma.uberRideRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-1' },
        data: expect.objectContaining({
          rideId: 'ride-2',
          status: 'ACCEPTED',
        }),
      })
    );

    // Verify socket notification was sent
    expect(notifyRideUpdated).toHaveBeenCalled();
  });

  it('should handle ride capacity limits', async () => {
    const request = makeRequest();
    // The other request's ride is full (4/4 passengers) and has multiple existing requests
    const otherRequest = makeOtherRequest({
      ride: {
        id: 'ride-2',
        status: 'MATCHING',
        currentPassengers: 4,
        maxPassengers: 4,
        requests: [
          { id: 'request-2', status: 'ACCEPTED' },
          { id: 'request-3', status: 'ACCEPTED' },
          { id: 'request-4', status: 'ACCEPTED' },
          { id: 'request-5', status: 'ACCEPTED' },
        ],
      },
    });

    (prisma.uberRideRequest.findUnique as jest.Mock).mockResolvedValue(request);
    (prisma.uberRideRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.uberRideRequest.findMany as jest.Mock).mockResolvedValue([otherRequest]);
    (areDestinationsClose as jest.Mock).mockReturnValue(true);
    (isDetourAcceptable as jest.Mock).mockResolvedValue(true);

    const result = await findMatches('request-1');

    // Ride is full (4/4) and has more than 1 request so it can't be merged
    expect(result.matched).toBe(false);
    expect(result.message).toContain('pleins');
  });
});

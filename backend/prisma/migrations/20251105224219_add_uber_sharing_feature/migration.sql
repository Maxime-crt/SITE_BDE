-- AlterTable
ALTER TABLE "events" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bdeCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "homeCity" TEXT,
ADD COLUMN     "homeLatitude" DOUBLE PRECISION,
ADD COLUMN     "homeLongitude" DOUBLE PRECISION,
ADD COLUMN     "homePostcode" TEXT;

-- CreateTable
CREATE TABLE "uber_rides" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MATCHING',
    "departureTime" TIMESTAMP(3) NOT NULL,
    "departNow" BOOLEAN NOT NULL DEFAULT false,
    "maxPassengers" INTEGER NOT NULL DEFAULT 4,
    "currentPassengers" INTEGER NOT NULL DEFAULT 0,
    "departureAddress" TEXT NOT NULL,
    "departureLat" DOUBLE PRECISION NOT NULL,
    "departureLng" DOUBLE PRECISION NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "finalCost" DOUBLE PRECISION,
    "route" JSONB,
    "routePolyline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uber_rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uber_ride_requests" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "maxDepartureTime" TIMESTAMP(3) NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "destinationPostcode" TEXT NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "femaleOnly" BOOLEAN NOT NULL DEFAULT false,
    "isInitiator" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uber_ride_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uber_ride_messages" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uber_ride_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uber_ride_payments" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "preAuthAmount" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uber_ride_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rideId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uber_ride_requests_rideId_userId_key" ON "uber_ride_requests"("rideId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "uber_ride_payments_rideId_userId_key" ON "uber_ride_payments"("rideId", "userId");

-- AddForeignKey
ALTER TABLE "uber_rides" ADD CONSTRAINT "uber_rides_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_requests" ADD CONSTRAINT "uber_ride_requests_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "uber_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_requests" ADD CONSTRAINT "uber_ride_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_requests" ADD CONSTRAINT "uber_ride_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_messages" ADD CONSTRAINT "uber_ride_messages_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "uber_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_messages" ADD CONSTRAINT "uber_ride_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_payments" ADD CONSTRAINT "uber_ride_payments_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "uber_rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_payments" ADD CONSTRAINT "uber_ride_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

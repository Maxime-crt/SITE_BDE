-- DropForeignKey
ALTER TABLE "event_ratings" DROP CONSTRAINT "event_ratings_eventId_fkey";

-- DropForeignKey
ALTER TABLE "event_ratings" DROP CONSTRAINT "event_ratings_userId_fkey";

-- DropForeignKey
ALTER TABLE "support_messages" DROP CONSTRAINT "support_messages_userId_fkey";

-- DropForeignKey
ALTER TABLE "uber_ride_messages" DROP CONSTRAINT "uber_ride_messages_userId_fkey";

-- AddForeignKey
ALTER TABLE "event_ratings" ADD CONSTRAINT "event_ratings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ratings" ADD CONSTRAINT "event_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uber_ride_messages" ADD CONSTRAINT "uber_ride_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the `uber_ride_payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "uber_ride_payments" DROP CONSTRAINT "uber_ride_payments_rideId_fkey";

-- DropForeignKey
ALTER TABLE "uber_ride_payments" DROP CONSTRAINT "uber_ride_payments_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "charterAcceptedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "uber_ride_payments";

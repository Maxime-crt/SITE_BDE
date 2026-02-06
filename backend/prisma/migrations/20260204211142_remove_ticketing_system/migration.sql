/*
  Warnings:

  - You are about to drop the column `ticketPrice` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `bdeCredit` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `tickets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_eventId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_userId_fkey";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "ticketPrice";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "bdeCredit";

-- DropTable
DROP TABLE "tickets";

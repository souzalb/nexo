/*
  Warnings:

  - You are about to drop the column `recurringBookingId` on the `Booking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Booking" DROP COLUMN "recurringBookingId",
ADD COLUMN     "bookingGroupId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE INDEX "Booking_bookingGroupId_idx" ON "public"."Booking"("bookingGroupId");

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

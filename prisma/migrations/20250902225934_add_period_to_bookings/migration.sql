-- CreateEnum
CREATE TYPE "public"."Period" AS ENUM ('MANHA', 'TARDE', 'NOITE');

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "period" "public"."Period" NOT NULL DEFAULT 'MANHA';

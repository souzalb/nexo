-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('WAITING', 'VERIFIED', 'SUSPECTED_NO_SHOW', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "IotMode" AS ENUM ('OFF', 'OBSERVE', 'AUTOMATIC');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "attendance" "AttendanceStatus" NOT NULL DEFAULT 'WAITING',
ADD COLUMN     "confirmationDeadline" TIMESTAMP(3),
ADD COLUMN     "releaseReason" TEXT,
ADD COLUMN     "releasedAt" TIMESTAMP(3),
ADD COLUMN     "verificationSource" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "warnedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RoomIotConfig" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "mode" "IotMode" NOT NULL DEFAULT 'OBSERVE',
    "warningMinutes" INTEGER NOT NULL DEFAULT 10,
    "releaseMinutes" INTEGER NOT NULL DEFAULT 20,
    "heartbeatSeconds" INTEGER NOT NULL DEFAULT 90,
    "lastSeenAt" TIMESTAMP(3),
    "healthySince" TIMESTAMP(3),
    "lastMotionAt" TIMESTAMP(3),
    "bootId" TEXT,
    "lastSequence" INTEGER NOT NULL DEFAULT -1,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomIotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IotTelemetry" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "bootId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motion" BOOLEAN NOT NULL,
    "ready" BOOLEAN NOT NULL,

    CONSTRAINT "IotTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IotRuntime" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "lastTickAt" TIMESTAMP(3) NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "IotRuntime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IotEmail" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "IotEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomIotConfig_roomId_key" ON "RoomIotConfig"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomIotConfig_deviceId_key" ON "RoomIotConfig"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomIotConfig_topic_key" ON "RoomIotConfig"("topic");

-- CreateIndex
CREATE INDEX "IotTelemetry_configId_receivedAt_idx" ON "IotTelemetry"("configId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IotTelemetry_configId_bootId_sequence_key" ON "IotTelemetry"("configId", "bootId", "sequence");

-- CreateIndex
CREATE INDEX "AttendanceEvent_bookingId_createdAt_idx" ON "AttendanceEvent"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IotEmail_dedupeKey_key" ON "IotEmail"("dedupeKey");

-- AddForeignKey
ALTER TABLE "RoomIotConfig" ADD CONSTRAINT "RoomIotConfig_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IotTelemetry" ADD CONSTRAINT "IotTelemetry_configId_fkey" FOREIGN KEY ("configId") REFERENCES "RoomIotConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

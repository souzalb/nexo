-- CreateTable
CREATE TABLE "public"."BookingRequest" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "timeSlots" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "weekdays" INTEGER[],
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."BookingRequest" ADD CONSTRAINT "BookingRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingRequest" ADD CONSTRAINT "BookingRequest_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `resources` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Room" DROP COLUMN "resources";

-- CreateTable
CREATE TABLE "public"."Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_ResourceToRoom" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResourceToRoom_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resource_name_key" ON "public"."Resource"("name");

-- CreateIndex
CREATE INDEX "_ResourceToRoom_B_index" ON "public"."_ResourceToRoom"("B");

-- AddForeignKey
ALTER TABLE "public"."_ResourceToRoom" ADD CONSTRAINT "_ResourceToRoom_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ResourceToRoom" ADD CONSTRAINT "_ResourceToRoom_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

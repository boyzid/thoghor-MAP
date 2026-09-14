/*
  Warnings:

  - Added the required column `source` to the `Gap` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GapSource" AS ENUM ('BOOK', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "GapStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Gap" ADD COLUMN     "source" "GapSource" NOT NULL,
ADD COLUMN     "status" "GapStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Gap_status_source_idx" ON "Gap"("status", "source");

-- CreateIndex
CREATE INDEX "Gap_creatorId_status_idx" ON "Gap"("creatorId", "status");

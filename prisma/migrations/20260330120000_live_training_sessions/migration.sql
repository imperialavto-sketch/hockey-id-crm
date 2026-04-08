-- CreateEnum
CREATE TYPE "LiveTrainingMode" AS ENUM ('ice', 'ofp', 'mixed');

-- CreateEnum
CREATE TYPE "LiveTrainingSessionStatus" AS ENUM ('live', 'review', 'confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "LiveTrainingObservationSentiment" AS ENUM ('positive', 'negative', 'neutral');

-- CreateTable
CREATE TABLE "LiveTrainingSession" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "mode" "LiveTrainingMode" NOT NULL,
    "status" "LiveTrainingSessionStatus" NOT NULL DEFAULT 'live',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveTrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveTrainingObservationDraft" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT,
    "playerNameRaw" TEXT,
    "sourceText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sentiment" "LiveTrainingObservationSentiment" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveTrainingObservationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveTrainingSession_coachId_status_idx" ON "LiveTrainingSession"("coachId", "status");

-- CreateIndex
CREATE INDEX "LiveTrainingSession_teamId_idx" ON "LiveTrainingSession"("teamId");

-- CreateIndex
CREATE INDEX "LiveTrainingObservationDraft_sessionId_idx" ON "LiveTrainingObservationDraft"("sessionId");

-- AddForeignKey
ALTER TABLE "LiveTrainingSession" ADD CONSTRAINT "LiveTrainingSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingObservationDraft" ADD CONSTRAINT "LiveTrainingObservationDraft_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingObservationDraft" ADD CONSTRAINT "LiveTrainingObservationDraft_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

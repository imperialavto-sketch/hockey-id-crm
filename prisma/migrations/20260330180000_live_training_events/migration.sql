-- CreateEnum
CREATE TYPE "LiveTrainingEventSourceType" AS ENUM ('manual_stub', 'transcript_segment', 'system');

-- CreateTable
CREATE TABLE "LiveTrainingEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceType" "LiveTrainingEventSourceType" NOT NULL DEFAULT 'manual_stub',
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT,
    "playerId" TEXT,
    "playerNameRaw" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'observation',
    "category" TEXT,
    "sentiment" "LiveTrainingObservationSentiment",
    "confidence" DOUBLE PRECISION,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveTrainingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveTrainingEvent_sessionId_createdAt_idx" ON "LiveTrainingEvent"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "LiveTrainingEvent" ADD CONSTRAINT "LiveTrainingEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingEvent" ADD CONSTRAINT "LiveTrainingEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

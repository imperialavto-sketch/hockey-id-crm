-- AlterTable
ALTER TABLE "LiveTrainingObservationDraft" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LiveTrainingObservationDraft_sessionId_deletedAt_idx" ON "LiveTrainingObservationDraft"("sessionId", "deletedAt");

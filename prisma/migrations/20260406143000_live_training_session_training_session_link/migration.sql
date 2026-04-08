-- Canonical nullable link: LiveTrainingSession -> TrainingSession (scheduled slot).
ALTER TABLE "LiveTrainingSession" ADD COLUMN "trainingSessionId" TEXT;

CREATE INDEX "LiveTrainingSession_trainingSessionId_idx" ON "LiveTrainingSession"("trainingSessionId");

ALTER TABLE "LiveTrainingSession" ADD CONSTRAINT "LiveTrainingSession_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Arena: apply next-training focus from live report-draft to next scheduled TrainingSession.

ALTER TABLE "TrainingSession" ADD COLUMN "arenaNextTrainingFocus" TEXT;

ALTER TABLE "LiveTrainingSession" ADD COLUMN "arenaNextFocusAppliedAt" TIMESTAMP(3);
ALTER TABLE "LiveTrainingSession" ADD COLUMN "arenaNextFocusTargetTrainingSessionId" TEXT;
ALTER TABLE "LiveTrainingSession" ADD COLUMN "arenaNextFocusLine" TEXT;

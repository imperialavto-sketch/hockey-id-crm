-- SESSION JOURNAL SSOT (Phase 5B). LEGACY `TrainingJournal` unchanged. NO AUTO-BACKFILL.

CREATE TABLE "TrainingSessionCoachJournal" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "topic" TEXT,
    "goals" TEXT,
    "notes" TEXT,
    "teamComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSessionCoachJournal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingSessionCoachJournal_trainingSessionId_coachId_key" ON "TrainingSessionCoachJournal"("trainingSessionId", "coachId");

CREATE INDEX "TrainingSessionCoachJournal_coachId_idx" ON "TrainingSessionCoachJournal"("coachId");

ALTER TABLE "TrainingSessionCoachJournal" ADD CONSTRAINT "TrainingSessionCoachJournal_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainingSessionCoachJournal" ADD CONSTRAINT "TrainingSessionCoachJournal_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

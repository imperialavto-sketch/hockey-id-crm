-- PHASE 40: persisted continuity snapshot on confirmed live training sessions
ALTER TABLE "LiveTrainingSession" ADD COLUMN "continuitySnapshotJson" JSONB;

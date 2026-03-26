-- TrainingSession: kind ice|ofp + optional subType; legacy types migrated to ice (except ofp).

ALTER TABLE "TrainingSession" ADD COLUMN "subType" TEXT;

UPDATE "TrainingSession"
SET "type" = CASE WHEN "type" = 'ofp' THEN 'ofp' ELSE 'ice' END;

ALTER TABLE "TrainingSession" ALTER COLUMN "type" SET DEFAULT 'ice';

-- TeamGroup UI color; Player.current group; legacy Training.group; optional TrainingSession.group (whole team)

ALTER TABLE "TeamGroup" ADD COLUMN IF NOT EXISTS "color" TEXT;

ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

ALTER TABLE "TrainingSession" DROP CONSTRAINT IF EXISTS "TrainingSession_groupId_fkey";
ALTER TABLE "TrainingSession" ALTER COLUMN "groupId" DROP NOT NULL;
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Player" ADD CONSTRAINT "Player_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Training" ADD CONSTRAINT "Training_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

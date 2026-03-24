-- AlterTable: add teamId, make endedAt nullable for active sessions
ALTER TABLE "CoachSession" ADD COLUMN "teamId" TEXT;
ALTER TABLE "CoachSession" ALTER COLUMN "endedAt" DROP NOT NULL;

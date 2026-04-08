-- CreateEnum
CREATE TYPE "GameEventType" AS ENUM ('GOAL', 'ASSIST', 'SHOT', 'TURNOVER', 'TAKEAWAY', 'ZONE_ENTRY_SUCCESS', 'ZONE_ENTRY_FAIL', 'PASS_SUCCESS', 'PASS_FAIL', 'GOOD_DECISION', 'BAD_DECISION');

-- CreateEnum
CREATE TYPE "BehaviorLogType" AS ENUM ('GOOD_POSITIONING', 'LOST_POSITION', 'RETURNS_TO_DEFENSE', 'IGNORES_TEAMPLAY', 'ACTIVE_PLAY', 'PASSIVE_PLAY', 'GOOD_EFFORT', 'LOW_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "BehaviorIntensity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('SKATING', 'STICKHANDLING', 'PASSING', 'SHOOTING', 'BALANCE', 'GAME_WITHOUT_PUCK', 'ONE_ON_ONE');

-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('WEAK', 'DEVELOPING', 'STABLE', 'STRONG');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('UP', 'SAME', 'DOWN');

-- CreateEnum
CREATE TYPE "OFPTestType" AS ENUM ('SPRINT_10M', 'SPRINT_20M', 'SHUTTLE_RUN', 'VERTICAL_JUMP', 'BROAD_JUMP', 'PLANK', 'PUSHUPS', 'BALANCE_TEST');

-- CreateEnum
CREATE TYPE "StatsSource" AS ENUM ('MANUAL', 'VOICE', 'AI', 'IMPORT');

-- CreateEnum
CREATE TYPE "TrainingReportStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "SnapshotPeriodType" AS ENUM ('WEEK', 'MONTH', 'SEASON', 'CUSTOM');

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "type" "GameEventType" NOT NULL,
    "value" DECIMAL(14,4),
    "note" TEXT,
    "source" "StatsSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "createdByCoachId" TEXT,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorLog" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "type" "BehaviorLogType" NOT NULL,
    "intensity" "BehaviorIntensity",
    "note" TEXT NOT NULL,
    "source" "StatsSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "createdByCoachId" TEXT,

    CONSTRAINT "BehaviorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillProgress" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "skill" "SkillType" NOT NULL,
    "status" "SkillStatus" NOT NULL,
    "trend" "TrendDirection" NOT NULL,
    "note" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "createdByCoachId" TEXT,

    CONSTRAINT "SkillProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OFPResult" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "testType" "OFPTestType" NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "source" "StatsSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "createdByCoachId" TEXT,

    CONSTRAINT "OFPResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerTrainingReport" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "rawText" TEXT,
    "summary" TEXT,
    "coachNote" TEXT,
    "status" "TrainingReportStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "StatsSource" NOT NULL,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "createdByCoachId" TEXT,

    CONSTRAINT "PlayerTrainingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerIndex" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "attackIndex" DECIMAL(6,3),
    "defenseIndex" DECIMAL(6,3),
    "skatingIndex" DECIMAL(6,3),
    "iqIndex" DECIMAL(6,3),
    "physicalIndex" DECIMAL(6,3),
    "overallIndex" DECIMAL(6,3),
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStatsSnapshot" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "periodType" "SnapshotPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "goals" INTEGER,
    "assists" INTEGER,
    "shots" INTEGER,
    "takeaways" INTEGER,
    "turnovers" INTEGER,
    "passSuccess" INTEGER,
    "passFail" INTEGER,
    "attackIndex" DECIMAL(6,3),
    "defenseIndex" DECIMAL(6,3),
    "skatingIndex" DECIMAL(6,3),
    "physicalIndex" DECIMAL(6,3),
    "overallIndex" DECIMAL(6,3),
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStatsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameEvent_playerId_createdAt_idx" ON "GameEvent"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "GameEvent_trainingSessionId_idx" ON "GameEvent"("trainingSessionId");

-- CreateIndex
CREATE INDEX "GameEvent_playerId_trainingSessionId_idx" ON "GameEvent"("playerId", "trainingSessionId");

-- CreateIndex
CREATE INDEX "BehaviorLog_playerId_createdAt_idx" ON "BehaviorLog"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "BehaviorLog_trainingSessionId_idx" ON "BehaviorLog"("trainingSessionId");

-- CreateIndex
CREATE INDEX "BehaviorLog_playerId_trainingSessionId_idx" ON "BehaviorLog"("playerId", "trainingSessionId");

-- CreateIndex
CREATE INDEX "SkillProgress_playerId_measuredAt_idx" ON "SkillProgress"("playerId", "measuredAt");

-- CreateIndex
CREATE INDEX "SkillProgress_playerId_skill_measuredAt_idx" ON "SkillProgress"("playerId", "skill", "measuredAt");

-- CreateIndex
CREATE INDEX "OFPResult_playerId_measuredAt_idx" ON "OFPResult"("playerId", "measuredAt");

-- CreateIndex
CREATE INDEX "OFPResult_trainingSessionId_idx" ON "OFPResult"("trainingSessionId");

-- CreateIndex
CREATE INDEX "PlayerTrainingReport_playerId_trainingSessionId_idx" ON "PlayerTrainingReport"("playerId", "trainingSessionId");

-- CreateIndex
CREATE INDEX "PlayerTrainingReport_trainingSessionId_idx" ON "PlayerTrainingReport"("trainingSessionId");

-- CreateIndex
CREATE INDEX "PlayerIndex_playerId_calculatedAt_idx" ON "PlayerIndex"("playerId", "calculatedAt");

-- CreateIndex
CREATE INDEX "PlayerStatsSnapshot_playerId_periodStart_idx" ON "PlayerStatsSnapshot"("playerId", "periodStart");

-- CreateIndex
CREATE INDEX "PlayerStatsSnapshot_playerId_periodType_periodStart_idx" ON "PlayerStatsSnapshot"("playerId", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "PlayerStatsSnapshot_periodStart_periodEnd_idx" ON "PlayerStatsSnapshot"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorLog" ADD CONSTRAINT "BehaviorLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorLog" ADD CONSTRAINT "BehaviorLog_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorLog" ADD CONSTRAINT "BehaviorLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviorLog" ADD CONSTRAINT "BehaviorLog_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillProgress" ADD CONSTRAINT "SkillProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillProgress" ADD CONSTRAINT "SkillProgress_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillProgress" ADD CONSTRAINT "SkillProgress_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OFPResult" ADD CONSTRAINT "OFPResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OFPResult" ADD CONSTRAINT "OFPResult_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OFPResult" ADD CONSTRAINT "OFPResult_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OFPResult" ADD CONSTRAINT "OFPResult_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTrainingReport" ADD CONSTRAINT "PlayerTrainingReport_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTrainingReport" ADD CONSTRAINT "PlayerTrainingReport_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTrainingReport" ADD CONSTRAINT "PlayerTrainingReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerTrainingReport" ADD CONSTRAINT "PlayerTrainingReport_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerIndex" ADD CONSTRAINT "PlayerIndex_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStatsSnapshot" ADD CONSTRAINT "PlayerStatsSnapshot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

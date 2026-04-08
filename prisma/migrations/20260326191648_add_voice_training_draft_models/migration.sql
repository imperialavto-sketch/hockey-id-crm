-- CreateEnum
CREATE TYPE "VoiceTrainingDraftSessionStatus" AS ENUM ('draft', 'reviewed', 'confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "VoiceTrainingDraftResolutionStatus" AS ENUM ('unresolved', 'auto_resolved', 'manual_resolved', 'ignored');

-- CreateTable
CREATE TABLE "VoiceTrainingDraftSession" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "status" "VoiceTrainingDraftSessionStatus" NOT NULL DEFAULT 'draft',
    "rawTranscript" TEXT,
    "aiSummary" TEXT,
    "confirmChecksum" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceTrainingDraftSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceTrainingDraftObservation" (
    "id" TEXT NOT NULL,
    "draftSessionId" TEXT NOT NULL,
    "playerId" TEXT,
    "playerNameRaw" TEXT,
    "text" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION,
    "resolutionStatus" "VoiceTrainingDraftResolutionStatus" NOT NULL DEFAULT 'unresolved',
    "effort" INTEGER,
    "focus" INTEGER,
    "discipline" INTEGER,
    "note" TEXT,
    "sourceChunkRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceTrainingDraftObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftSession_trainingId_idx" ON "VoiceTrainingDraftSession"("trainingId");

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftSession_coachId_idx" ON "VoiceTrainingDraftSession"("coachId");

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftSession_status_idx" ON "VoiceTrainingDraftSession"("status");

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftSession_groupId_weekStartDate_idx" ON "VoiceTrainingDraftSession"("groupId", "weekStartDate");

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftObservation_draftSessionId_idx" ON "VoiceTrainingDraftObservation"("draftSessionId");

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftObservation_playerId_idx" ON "VoiceTrainingDraftObservation"("playerId");

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftObservation_resolutionStatus_idx" ON "VoiceTrainingDraftObservation"("resolutionStatus");

-- CreateIndex
CREATE INDEX "VoiceTrainingDraftObservation_draftSessionId_orderIndex_idx" ON "VoiceTrainingDraftObservation"("draftSessionId", "orderIndex");

-- AddForeignKey
ALTER TABLE "VoiceTrainingDraftSession" ADD CONSTRAINT "VoiceTrainingDraftSession_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTrainingDraftSession" ADD CONSTRAINT "VoiceTrainingDraftSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTrainingDraftSession" ADD CONSTRAINT "VoiceTrainingDraftSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTrainingDraftSession" ADD CONSTRAINT "VoiceTrainingDraftSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTrainingDraftObservation" ADD CONSTRAINT "VoiceTrainingDraftObservation_draftSessionId_fkey" FOREIGN KEY ("draftSessionId") REFERENCES "VoiceTrainingDraftSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceTrainingDraftObservation" ADD CONSTRAINT "VoiceTrainingDraftObservation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

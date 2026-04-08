-- CreateTable
CREATE TABLE "LiveTrainingPlayerSignal" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "liveTrainingSessionId" TEXT NOT NULL,
    "liveTrainingObservationDraftId" TEXT NOT NULL,
    "liveTrainingEventId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'live_training',
    "metricDomain" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "signalDirection" "LiveTrainingObservationSentiment" NOT NULL,
    "signalStrength" INTEGER NOT NULL DEFAULT 1,
    "evidenceText" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveTrainingPlayerSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveTrainingPlayerSignal_liveTrainingObservationDraftId_key" ON "LiveTrainingPlayerSignal"("liveTrainingObservationDraftId");

-- CreateIndex
CREATE INDEX "LiveTrainingPlayerSignal_playerId_createdAt_idx" ON "LiveTrainingPlayerSignal"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveTrainingPlayerSignal_liveTrainingSessionId_idx" ON "LiveTrainingPlayerSignal"("liveTrainingSessionId");

-- CreateIndex
CREATE INDEX "LiveTrainingPlayerSignal_teamId_idx" ON "LiveTrainingPlayerSignal"("teamId");

-- AddForeignKey
ALTER TABLE "LiveTrainingPlayerSignal" ADD CONSTRAINT "LiveTrainingPlayerSignal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingPlayerSignal" ADD CONSTRAINT "LiveTrainingPlayerSignal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingPlayerSignal" ADD CONSTRAINT "LiveTrainingPlayerSignal_liveTrainingSessionId_fkey" FOREIGN KEY ("liveTrainingSessionId") REFERENCES "LiveTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingPlayerSignal" ADD CONSTRAINT "LiveTrainingPlayerSignal_liveTrainingObservationDraftId_fkey" FOREIGN KEY ("liveTrainingObservationDraftId") REFERENCES "LiveTrainingObservationDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingPlayerSignal" ADD CONSTRAINT "LiveTrainingPlayerSignal_liveTrainingEventId_fkey" FOREIGN KEY ("liveTrainingEventId") REFERENCES "LiveTrainingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

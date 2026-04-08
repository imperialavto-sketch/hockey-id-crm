-- Structured coach metrics per player per TrainingSession (additive; does not replace evaluations).

CREATE TABLE "PlayerSessionStructuredMetrics" (
    "id" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "source" "StatsSource" NOT NULL DEFAULT 'MANUAL',
    "iceTechnical" JSONB,
    "tactical" JSONB,
    "ofpQualitative" JSONB,
    "physical" JSONB,
    "behavioral" JSONB,
    "observation" JSONB,
    "voiceMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSessionStructuredMetrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerSessionStructuredMetrics_trainingSessionId_playerId_key" ON "PlayerSessionStructuredMetrics"("trainingSessionId", "playerId");

CREATE INDEX "PlayerSessionStructuredMetrics_playerId_updatedAt_idx" ON "PlayerSessionStructuredMetrics"("playerId", "updatedAt");

ALTER TABLE "PlayerSessionStructuredMetrics" ADD CONSTRAINT "PlayerSessionStructuredMetrics_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerSessionStructuredMetrics" ADD CONSTRAINT "PlayerSessionStructuredMetrics_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

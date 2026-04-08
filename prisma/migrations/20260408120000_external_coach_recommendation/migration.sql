-- STEP 19: подтверждение подбора внешнего тренера (pending | confirmed | dismissed).
CREATE TABLE "ExternalCoachRecommendation" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "playerId" TEXT,
    "externalCoachId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL DEFAULT 'extra_training',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCoachRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalCoachRecommendation_liveSessionId_idx" ON "ExternalCoachRecommendation"("liveSessionId");
CREATE INDEX "ExternalCoachRecommendation_liveSessionId_externalCoachId_playerId_idx" ON "ExternalCoachRecommendation"("liveSessionId", "externalCoachId", "playerId");

ALTER TABLE "ExternalCoachRecommendation" ADD CONSTRAINT "ExternalCoachRecommendation_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalCoachRecommendation" ADD CONSTRAINT "ExternalCoachRecommendation_externalCoachId_fkey" FOREIGN KEY ("externalCoachId") REFERENCES "ExternalCoach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

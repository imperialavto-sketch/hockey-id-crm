-- STEP 22: ExternalCoachFeedback (1:1 с ExternalCoachRecommendation)
CREATE TABLE "ExternalCoachFeedback" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCoachFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalCoachFeedback_recommendationId_key" ON "ExternalCoachFeedback"("recommendationId");

CREATE INDEX "ExternalCoachFeedback_recommendationId_idx" ON "ExternalCoachFeedback"("recommendationId");

ALTER TABLE "ExternalCoachFeedback" ADD CONSTRAINT "ExternalCoachFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "ExternalCoachRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

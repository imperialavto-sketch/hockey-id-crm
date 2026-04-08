-- CreateTable
CREATE TABLE "ExternalTrainingReport" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "focusAreas" JSONB,
    "resultNotes" TEXT,
    "nextSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalTrainingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalTrainingReport_playerId_createdAt_idx" ON "ExternalTrainingReport"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalTrainingReport_requestId_idx" ON "ExternalTrainingReport"("requestId");

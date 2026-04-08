-- CreateTable
CREATE TABLE "ExternalTrainingRequest" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "skillKey" TEXT,
    "severity" DOUBLE PRECISION,
    "reasonSummary" TEXT,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "proposedDate" TIMESTAMP(3),
    "proposedLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalTrainingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalTrainingRequest_playerId_createdAt_idx" ON "ExternalTrainingRequest"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalTrainingRequest_parentId_createdAt_idx" ON "ExternalTrainingRequest"("parentId", "createdAt");

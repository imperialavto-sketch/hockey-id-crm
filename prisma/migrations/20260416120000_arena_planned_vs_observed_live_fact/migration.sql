-- Arena: minimal persisted planned-vs-observed fact per confirmed live session (additive).

CREATE TYPE "ArenaPlannedVsObservedComparisonStatus" AS ENUM ('aligned', 'mixed', 'diverged', 'insufficient_data');

CREATE TABLE "ArenaPlannedVsObservedLiveFact" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "trainingSessionId" TEXT,
    "liveTrainingSessionId" TEXT NOT NULL,
    "plannedFocusText" TEXT,
    "observedFocusText" TEXT,
    "comparisonStatus" "ArenaPlannedVsObservedComparisonStatus" NOT NULL,
    "observedDomainsJson" JSONB NOT NULL,
    "supportingSignalCount" INTEGER NOT NULL,
    "concernSignalCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaPlannedVsObservedLiveFact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArenaPlannedVsObservedLiveFact_liveTrainingSessionId_key" ON "ArenaPlannedVsObservedLiveFact"("liveTrainingSessionId");

CREATE INDEX "ArenaPlannedVsObservedLiveFact_teamId_idx" ON "ArenaPlannedVsObservedLiveFact"("teamId");

CREATE INDEX "ArenaPlannedVsObservedLiveFact_schoolId_idx" ON "ArenaPlannedVsObservedLiveFact"("schoolId");

ALTER TABLE "ArenaPlannedVsObservedLiveFact" ADD CONSTRAINT "ArenaPlannedVsObservedLiveFact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArenaPlannedVsObservedLiveFact" ADD CONSTRAINT "ArenaPlannedVsObservedLiveFact_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArenaPlannedVsObservedLiveFact" ADD CONSTRAINT "ArenaPlannedVsObservedLiveFact_liveTrainingSessionId_fkey" FOREIGN KEY ("liveTrainingSessionId") REFERENCES "LiveTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArenaPlannedVsObservedLiveFact" ADD CONSTRAINT "ArenaPlannedVsObservedLiveFact_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

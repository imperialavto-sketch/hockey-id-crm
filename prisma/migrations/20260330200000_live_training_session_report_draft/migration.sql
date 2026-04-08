-- CreateEnum
CREATE TYPE "LiveTrainingSessionReportDraftStatus" AS ENUM ('draft', 'ready');

-- CreateTable
CREATE TABLE "LiveTrainingSessionReportDraft" (
    "id" TEXT NOT NULL,
    "liveTrainingSessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "status" "LiveTrainingSessionReportDraftStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveTrainingSessionReportDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveTrainingSessionReportDraft_liveTrainingSessionId_key" ON "LiveTrainingSessionReportDraft"("liveTrainingSessionId");

-- CreateIndex
CREATE INDEX "LiveTrainingSessionReportDraft_teamId_idx" ON "LiveTrainingSessionReportDraft"("teamId");

-- CreateIndex
CREATE INDEX "LiveTrainingSessionReportDraft_coachId_idx" ON "LiveTrainingSessionReportDraft"("coachId");

-- AddForeignKey
ALTER TABLE "LiveTrainingSessionReportDraft" ADD CONSTRAINT "LiveTrainingSessionReportDraft_liveTrainingSessionId_fkey" FOREIGN KEY ("liveTrainingSessionId") REFERENCES "LiveTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveTrainingSessionReportDraft" ADD CONSTRAINT "LiveTrainingSessionReportDraft_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

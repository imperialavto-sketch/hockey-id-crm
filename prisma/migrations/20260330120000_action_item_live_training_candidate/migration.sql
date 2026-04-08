-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN "liveTrainingCandidateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ActionItem_coachId_liveTrainingCandidateId_key" ON "ActionItem"("coachId", "liveTrainingCandidateId");

-- CreateIndex
CREATE INDEX "ActionItem_coachId_liveTrainingCandidateId_idx" ON "ActionItem"("coachId", "liveTrainingCandidateId");

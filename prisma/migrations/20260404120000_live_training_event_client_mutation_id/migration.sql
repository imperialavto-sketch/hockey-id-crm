-- AlterTable
ALTER TABLE "LiveTrainingEvent" ADD COLUMN "clientMutationId" TEXT;

-- AlterTable
ALTER TABLE "LiveTrainingObservationDraft" ADD COLUMN "liveTrainingEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LiveTrainingEvent_sessionId_clientMutationId_key" ON "LiveTrainingEvent"("sessionId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveTrainingObservationDraft_liveTrainingEventId_key" ON "LiveTrainingObservationDraft"("liveTrainingEventId");

-- AddForeignKey
ALTER TABLE "LiveTrainingObservationDraft" ADD CONSTRAINT "LiveTrainingObservationDraft_liveTrainingEventId_fkey" FOREIGN KEY ("liveTrainingEventId") REFERENCES "LiveTrainingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

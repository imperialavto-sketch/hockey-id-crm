-- CreateTable
CREATE TABLE "PlayerSessionReport" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "summary" TEXT,
    "focusAreas" TEXT,
    "coachNote" TEXT,
    "parentMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSessionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSessionReport_trainingId_playerId_key" ON "PlayerSessionReport"("trainingId", "playerId");

-- AddForeignKey
ALTER TABLE "PlayerSessionReport" ADD CONSTRAINT "PlayerSessionReport_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSessionReport" ADD CONSTRAINT "PlayerSessionReport_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

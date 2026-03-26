-- CreateTable
CREATE TABLE "PlayerSessionEvaluation" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "effort" INTEGER,
    "focus" INTEGER,
    "discipline" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSessionEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSessionEvaluation_trainingId_playerId_key" ON "PlayerSessionEvaluation"("trainingId", "playerId");

-- AddForeignKey
ALTER TABLE "PlayerSessionEvaluation" ADD CONSTRAINT "PlayerSessionEvaluation_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSessionEvaluation" ADD CONSTRAINT "PlayerSessionEvaluation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TrainingSessionReport" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "summary" TEXT,
    "focusAreas" TEXT,
    "coachNote" TEXT,
    "parentMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSessionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSessionReport_trainingId_key" ON "TrainingSessionReport"("trainingId");

-- AddForeignKey
ALTER TABLE "TrainingSessionReport" ADD CONSTRAINT "TrainingSessionReport_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

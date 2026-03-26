-- AlterTable
ALTER TABLE "Coach" ADD COLUMN "isMarketplaceIndependent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coach" ADD COLUMN "linkedUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Coach_linkedUserId_key" ON "Coach"("linkedUserId");

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CoachAvailability" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachAvailability_coachId_date_idx" ON "CoachAvailability"("coachId", "date");

-- AddForeignKey
ALTER TABLE "CoachAvailability" ADD CONSTRAINT "CoachAvailability_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

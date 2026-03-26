-- CreateTable
CREATE TABLE "MarketplaceSlotBooking" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "bookerUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "playerId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSlotBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceSlotBooking_bookerUserId_createdAt_idx" ON "MarketplaceSlotBooking"("bookerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceSlotBooking_coachId_status_idx" ON "MarketplaceSlotBooking"("coachId", "status");

-- AddForeignKey
ALTER TABLE "MarketplaceSlotBooking" ADD CONSTRAINT "MarketplaceSlotBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "CoachAvailability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceSlotBooking" ADD CONSTRAINT "MarketplaceSlotBooking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

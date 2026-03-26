-- Marketplace slot booking payment foundation (independent coaches only).

ALTER TABLE "MarketplaceSlotBooking" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "MarketplaceSlotBooking" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "MarketplaceSlotBooking" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceSlotBooking" ADD COLUMN "paymentReference" TEXT;
ALTER TABLE "MarketplaceSlotBooking" ADD COLUMN "amountSnapshot" INTEGER;

UPDATE "MarketplaceSlotBooking" AS msb
SET "amountSnapshot" = ca."price"
FROM "CoachAvailability" AS ca
WHERE ca."id" = msb."slotId" AND msb."amountSnapshot" IS NULL;

-- AlterTable: allow marketplace bookings against Coach (independent) instead of CoachProfile only
ALTER TABLE "CoachBookingRequest" ALTER COLUMN "coachId" DROP NOT NULL;

ALTER TABLE "CoachBookingRequest" ADD COLUMN "independentCoachId" TEXT;

ALTER TABLE "CoachBookingRequest" ADD CONSTRAINT "CoachBookingRequest_independentCoachId_fkey" FOREIGN KEY ("independentCoachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

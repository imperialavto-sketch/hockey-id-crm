-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "specialties" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "formats" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "priceFrom" INTEGER;

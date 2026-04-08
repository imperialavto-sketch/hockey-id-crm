-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'EXTERNAL_COACH';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "arenaExternalCoachKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_arenaExternalCoachKey_key" ON "User"("arenaExternalCoachKey");

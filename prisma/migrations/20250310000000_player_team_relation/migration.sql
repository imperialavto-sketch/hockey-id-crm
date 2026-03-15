-- AlterTable: add teamId, drop old team string column
ALTER TABLE "Player" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Player" DROP COLUMN "team";

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

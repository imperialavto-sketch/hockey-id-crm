-- Schedule MVP: TeamGroup, PlayerGroupAssignment, TrainingSession

CREATE TABLE "TeamGroup" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerGroupAssignment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "assignedByCoachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerGroupAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "locationName" TEXT,
    "locationAddress" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "sessionStatus" TEXT NOT NULL DEFAULT 'planned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerGroupAssignment_playerId_weekStartDate_key" ON "PlayerGroupAssignment"("playerId", "weekStartDate");

ALTER TABLE "TeamGroup" ADD CONSTRAINT "TeamGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerGroupAssignment" ADD CONSTRAINT "PlayerGroupAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerGroupAssignment" ADD CONSTRAINT "PlayerGroupAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerGroupAssignment" ADD CONSTRAINT "PlayerGroupAssignment_assignedByCoachId_fkey" FOREIGN KEY ("assignedByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CoachSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "coachUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachSessionObservation" (
    "id" TEXT NOT NULL,
    "coachSessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "skillType" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "note" TEXT,
    "createdAtTs" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachSessionObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachSessionPlayerSnapshot" (
    "id" TEXT NOT NULL,
    "coachSessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "skills" JSONB NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CoachSessionPlayerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachSessionParentDraft" (
    "id" TEXT NOT NULL,
    "coachSessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "parentMessage" TEXT NOT NULL,
    "positives" JSONB NOT NULL,
    "improvementAreas" JSONB NOT NULL,
    "focusSkills" JSONB NOT NULL,

    CONSTRAINT "CoachSessionParentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachSession_sessionId_key" ON "CoachSession"("sessionId");

-- AddForeignKey
ALTER TABLE "CoachSessionObservation" ADD CONSTRAINT "CoachSessionObservation_coachSessionId_fkey" FOREIGN KEY ("coachSessionId") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSessionPlayerSnapshot" ADD CONSTRAINT "CoachSessionPlayerSnapshot_coachSessionId_fkey" FOREIGN KEY ("coachSessionId") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachSessionParentDraft" ADD CONSTRAINT "CoachSessionParentDraft_coachSessionId_fkey" FOREIGN KEY ("coachSessionId") REFERENCES "CoachSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CoachPushDevice" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachPushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachPushDevice_coachId_expoPushToken_key" ON "CoachPushDevice"("coachId", "expoPushToken");

-- AddForeignKey
ALTER TABLE "CoachPushDevice" ADD CONSTRAINT "CoachPushDevice_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "VoiceNote" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "playerId" TEXT,
    "transcript" TEXT NOT NULL,
    "summary" TEXT,
    "highlightsJson" JSONB,
    "suggestionsJson" JSONB,
    "uploadId" TEXT,
    "audioFileName" TEXT,
    "audioMimeType" TEXT,
    "audioSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceNote_coachId_uploadId_key" ON "VoiceNote"("coachId", "uploadId");

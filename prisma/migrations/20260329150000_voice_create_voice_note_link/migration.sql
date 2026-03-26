-- AlterTable
ALTER TABLE "Report" ADD COLUMN "voiceNoteId" TEXT;

-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN "voiceNoteId" TEXT;

-- AlterTable
ALTER TABLE "ParentDraft" ADD COLUMN "voiceNoteId" TEXT;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentDraft" ADD CONSTRAINT "ParentDraft_voiceNoteId_fkey" FOREIGN KEY ("voiceNoteId") REFERENCES "VoiceNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

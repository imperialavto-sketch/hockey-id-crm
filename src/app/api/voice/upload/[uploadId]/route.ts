import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import type { VoiceProcessingStatus } from "@/lib/voice/pipeline-contract";
import { getVoiceUploadStatusOrPending } from "@/lib/voice/upload-registry";

function mergeWithVoiceNoteStatus(
  base: VoiceProcessingStatus,
  note: {
    transcript: string;
    summary: string | null;
    updatedAt: Date;
    suggestionsJson: unknown | null;
    highlightsJson: unknown | null;
  }
): VoiceProcessingStatus {
  const at = note.updatedAt.toISOString();
  const hasTranscript = typeof note.transcript === "string" && note.transcript.trim().length > 0;
  const hasSummary = typeof note.summary === "string" && note.summary.trim().length > 0;
  const hasSuggestions = Array.isArray(note.suggestionsJson) && note.suggestionsJson.length > 0;
  const highlights = Array.isArray(note.highlightsJson)
    ? note.highlightsJson.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, 8)
    : [];
  return {
    ...base,
    upload: {
      ...base.upload,
      status: base.upload.status === "failed" ? "failed" : "processed",
      updatedAt: at,
    },
    transcript: {
      status: hasTranscript ? "ready" : base.transcript.status,
      updatedAt: at,
      error: hasTranscript ? null : base.transcript.error,
      text: hasTranscript ? note.transcript.trim() : base.transcript.text,
    },
    summary: {
      status: hasSummary ? "ready" : "pending",
      updatedAt: at,
      error: null,
      text: hasSummary ? note.summary!.trim() : null,
      highlights: highlights.length > 0 ? highlights : base.summary.highlights,
    },
    derived: {
      actionItems: { status: hasSuggestions ? "ready" : "pending", updatedAt: at, error: null },
      reports: { status: hasSummary ? "ready" : "pending", updatedAt: at, error: null },
      parentDrafts: { status: hasSummary ? "ready" : "pending", updatedAt: at, error: null },
    },
  };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ uploadId: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { uploadId: rawUploadId } = await ctx.params;
  const uploadId = typeof rawUploadId === "string" ? rawUploadId.trim() : "";
  if (!uploadId) {
    return NextResponse.json({ error: "Некорректный uploadId" }, { status: 400 });
  }

  const base = getVoiceUploadStatusOrPending(uploadId, user!.id);

  const note = await prisma.voiceNote.findFirst({
    where: { coachId: user!.id, uploadId },
    select: { transcript: true, summary: true, updatedAt: true, suggestionsJson: true, highlightsJson: true },
  });
  const processing = note ? mergeWithVoiceNoteStatus(base, note) : base;

  return NextResponse.json({
    ok: true,
    uploadId,
    processing,
  });
}

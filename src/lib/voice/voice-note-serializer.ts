import type { Prisma, VoiceNote } from "@prisma/client";
import type { VoiceProcessingStatus } from "@/lib/voice/pipeline-contract";

/**
 * Soft validation for optional client-side AI snapshot on VoiceNote.
 * Only non-null plain objects are accepted; arrays / primitives are ignored.
 */
export function parseOptionalVoiceNoteAnalysisJson(
  raw: unknown
): Prisma.InputJsonValue | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  try {
    return JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/** List DTO only: true if note has a non-null stored JSON object (same shape gate as optional save). */
export function voiceNoteHasStoredAnalysisJson(
  analysisJson: VoiceNote["analysisJson"]
): boolean {
  if (analysisJson === null || analysisJson === undefined) return false;
  if (typeof analysisJson !== "object" || Array.isArray(analysisJson)) return false;
  return true;
}

export function buildVoiceProcessingFromVoiceNote(note: VoiceNote): VoiceProcessingStatus {
  const at = note.updatedAt.toISOString();
  const hasTranscript = note.transcript.trim().length > 0;
  const hasSummary = typeof note.summary === "string" && note.summary.trim().length > 0;
  const highlights = Array.isArray(note.highlightsJson)
    ? note.highlightsJson.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, 8)
    : [];
  const hasSuggestions = Array.isArray(note.suggestionsJson) && note.suggestionsJson.length > 0;
  const uploadId = note.uploadId || `voice_note_${note.id}`;

  return {
    upload: {
      uploadId,
      status: hasTranscript ? "processed" : "uploaded",
      fileName: note.audioFileName ?? null,
      mimeType: note.audioMimeType ?? null,
      sizeBytes: note.audioSizeBytes ?? null,
      durationSeconds: null,
      createdAt: note.createdAt.toISOString(),
      updatedAt: at,
      provider: "stub",
    },
    transcript: {
      status: hasTranscript ? "ready" : "pending",
      updatedAt: at,
      error: null,
      text: hasTranscript ? note.transcript : null,
    },
    summary: {
      status: hasSummary ? "ready" : "pending",
      updatedAt: at,
      error: null,
      text: hasSummary ? note.summary : null,
      highlights: highlights.length > 0 ? highlights : null,
    },
    derived: {
      actionItems: { status: hasSuggestions ? "ready" : "pending", updatedAt: at, error: null },
      reports: { status: hasSummary ? "ready" : "pending", updatedAt: at, error: null },
      parentDrafts: { status: hasSummary ? "ready" : "pending", updatedAt: at, error: null },
    },
  };
}

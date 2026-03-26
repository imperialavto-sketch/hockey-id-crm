import { apiFetch, ApiRequestError } from "@/lib/api";
import type { VoiceProcessingResult } from "@/lib/ai/types";
import type { VoiceIntentSuggestion } from "@/lib/voiceMvp";
import type { VoiceProcessingStatus } from "@/lib/voicePipeline/contracts";

export interface CreateVoiceNotePayload {
  playerId?: string;
  transcript: string;
  summary?: string | null;
  highlights?: string[];
  suggestions?: VoiceIntentSuggestion[];
  /** Client-side AI snapshot; sent only when available. */
  analysisJson?: VoiceProcessingResult;
  uploadId?: string;
  audioFileName?: string;
  audioMimeType?: string;
  audioSizeBytes?: number;
}

export interface CreatedVoiceNote {
  id: string;
  coachId: string;
  playerId: string | null;
  transcript: string;
  summary: string | null;
  highlightsJson: unknown | null;
  suggestionsJson: unknown | null;
  analysisJson?: unknown | null;
  uploadId: string | null;
  audioFileName: string | null;
  audioMimeType: string | null;
  audioSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
  processing?: VoiceProcessingStatus;
}

export type VoiceNotesResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface VoiceNoteListItem {
  id: string;
  playerId: string | null;
  playerName: string | null;
  summary: string | null;
  transcriptPreview: string;
  createdAt: string;
  audioFileName: string | null;
  uploadId: string | null;
  /** Сервер: сохранённый AI-разбор есть (без тела analysisJson в списке). */
  hasAnalysis?: boolean;
  processing?: VoiceProcessingStatus;
}

function toUserMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Неизвестная ошибка";
}

export async function createVoiceNote(
  payload: CreateVoiceNotePayload
): Promise<VoiceNotesResult<CreatedVoiceNote>> {
  try {
    const data = await apiFetch<CreatedVoiceNote>("/api/voice-notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

export async function getVoiceNotes(): Promise<VoiceNotesResult<VoiceNoteListItem[]>> {
  try {
    const data = await apiFetch<VoiceNoteListItem[]>("/api/voice-notes", {
      method: "GET",
    });
    return { ok: true, data: Array.isArray(data) ? data : [] };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

export async function getVoiceNoteById(
  id: string
): Promise<VoiceNotesResult<CreatedVoiceNote>> {
  try {
    const data = await apiFetch<CreatedVoiceNote>(`/api/voice-notes/${encodeURIComponent(id)}`, {
      method: "GET",
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

export type AnalyzeVoiceNoteResult =
  | { ok: true; analysisJson: unknown }
  | { ok: false };

/**
 * Server-backed пересчёт analysisJson (Phase 3.1+). Ошибки сети → `{ ok: false }`.
 */
export async function analyzeVoiceNote(id: string): Promise<AnalyzeVoiceNoteResult> {
  const trimmed = id.trim();
  if (!trimmed) return { ok: false };
  try {
    const data = await apiFetch<{ analysisJson: unknown; updatedAt: string }>(
      `/api/voice-notes/${encodeURIComponent(trimmed)}/analyze`,
      { method: "POST" }
    );
    return { ok: true, analysisJson: data.analysisJson };
  } catch {
    return { ok: false };
  }
}


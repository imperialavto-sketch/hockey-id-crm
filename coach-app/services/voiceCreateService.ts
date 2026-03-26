/**
 * Create flows for voice → server (Report, ActionItem, ParentDraft).
 * Uses coach-app Bearer auth via lib/api (apiFetch).
 */

import { apiFetch, ApiRequestError } from "@/lib/api";
import type { VoiceProcessingResult } from "@/lib/ai/types";
import {
  formatVoiceStarterForActionItem,
  formatVoiceStarterForParentDraft,
  formatVoiceStarterForReportDraft,
  type VoiceStarterPayload,
} from "@/lib/voiceMvp";

// --- Request payloads (API contract) ---

export interface CreateReportPayload {
  playerId?: string;
  title: string;
  content: string;
  voiceNoteId?: string;
}

export interface CreateActionItemPayload {
  playerId?: string;
  title: string;
  description: string;
  voiceNoteId?: string;
}

export interface CreateParentDraftPayload {
  playerId?: string;
  text: string;
  voiceNoteId?: string;
}

export interface VoiceNoteCreateSource {
  /** Persisted voice note id when creating from voice-notes screen (or equivalent). */
  id?: string | null;
  playerId: string | null;
  transcript: string;
  summary: string | null;
  highlightsJson: unknown | null;
  /** Valid server/client AI snapshot; optional — formatters use transcript/summary when absent. */
  aiProcessed?: VoiceProcessingResult | null;
}

// --- Normalized responses ---

export type VoiceCreateOk<T> = { ok: true; data: T };
export type VoiceCreateErr = { ok: false; error: string };
export type VoiceCreateResult<T> = VoiceCreateOk<T> | VoiceCreateErr;

export interface CreatedReport {
  id: string;
  coachId: string;
  playerId: string | null;
  title: string;
  content: string;
  voiceNoteId?: string | null;
  createdAt: string;
}

export interface CreatedActionItem {
  id: string;
  coachId: string;
  playerId: string | null;
  title: string;
  description: string;
  status: string;
  voiceNoteId?: string | null;
  createdAt: string;
}

export interface CreatedParentDraft {
  id: string;
  coachId: string;
  playerId: string | null;
  text: string;
  voiceNoteId?: string | null;
  createdAt: string;
}

function toUserMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Неизвестная ошибка";
}

function trimOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function toTranscriptPreview(text: string, maxLen = 220): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1).trimEnd()}…`;
}

function normalizeComposerText(text: string | null | undefined): string | null {
  if (typeof text !== "string") return null;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

function firstMeaningfulLine(text: string, maxLen: number): string | null {
  const line = text
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean);
  if (!line) return null;
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen - 1).trimEnd()}…`;
}

function safeHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function voiceNoteToStarterPayload(
  note: VoiceNoteCreateSource,
  intent: VoiceStarterPayload["intent"]
): VoiceStarterPayload {
  const transcript = trimOrNull(note.transcript) ?? "Заметка без расшифровки";
  const originId =
    typeof note.id === "string" ? trimOrNull(note.id) : null;
  const base: VoiceStarterPayload = {
    id: `voice_note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    intent,
    source: "voice-mvp",
    transcript,
    summary: trimOrNull(note.summary),
    highlights: safeHighlights(note.highlightsJson),
    context: note.playerId ? { playerId: note.playerId } : undefined,
    originVoiceNoteId: originId ?? undefined,
  };
  const ai = note.aiProcessed;
  if (ai) {
    return { ...base, aiProcessed: ai };
  }
  return base;
}

/** Собирает title/content для POST /api/reports из голосового starter. */
export function voiceStarterToCreateReportInput(
  payload: VoiceStarterPayload
): CreateReportPayload {
  const playerLabel = payload.context?.playerLabel?.trim();
  const summaryHead = payload.summary?.trim()?.split("\n")[0]?.trim();
  const titleBase =
    playerLabel != null && playerLabel.length > 0
      ? `Отчёт: ${playerLabel}`
      : summaryHead && summaryHead.length > 0
        ? summaryHead.length > 180
          ? `${summaryHead.slice(0, 177)}…`
          : summaryHead
        : "Отчёт из голосовой заметки";
  const title =
    titleBase.length > 200 ? `${titleBase.slice(0, 197)}…` : titleBase;
  const content = formatVoiceStarterForReportDraft(payload);
  const out: CreateReportPayload = { title, content };
  if (payload.context?.playerId?.trim()) {
    out.playerId = payload.context.playerId.trim();
  }
  const vid = payload.originVoiceNoteId?.trim();
  if (vid) out.voiceNoteId = vid;
  return out;
}

/** Собирает title/description для POST /api/actions. */
export function voiceStarterToCreateActionInput(
  payload: VoiceStarterPayload
): CreateActionItemPayload {
  const line = formatVoiceStarterForActionItem(payload);
  const title =
    line.length <= 120 ? line : `${line.slice(0, 117).trimEnd()}…`;
  const descriptionParts = [line];
  const t = payload.transcript?.trim();
  if (t) {
    descriptionParts.push("", "Детали (расшифровка):", t);
  }
  const description = descriptionParts.join("\n");
  const out: CreateActionItemPayload = { title, description };
  if (payload.context?.playerId?.trim()) {
    out.playerId = payload.context.playerId.trim();
  }
  const vid = payload.originVoiceNoteId?.trim();
  if (vid) out.voiceNoteId = vid;
  return out;
}

/** Сборка report payload с учётом ручной правки на destination-экране. */
export function voiceStarterToCreateReportInputFromEditedText(
  payload: VoiceStarterPayload,
  editedText: string
): CreateReportPayload {
  const base = voiceStarterToCreateReportInput(payload);
  const edited = normalizeComposerText(editedText);
  if (!edited) return base;

  const titleFromEdited = firstMeaningfulLine(edited, 200);
  const shouldUseEditedTitle = !base.title.trim() || /^Отчёт( из голосовой заметки)?:?/i.test(base.title);

  return {
    ...base,
    title: shouldUseEditedTitle && titleFromEdited ? titleFromEdited : base.title,
    content: edited,
  };
}

/** Сборка action payload с учётом ручной правки на destination-экране. */
export function voiceStarterToCreateActionInputFromEditedText(
  payload: VoiceStarterPayload,
  editedText: string
): CreateActionItemPayload {
  const base = voiceStarterToCreateActionInput(payload);
  const edited = normalizeComposerText(editedText);
  if (!edited) return base;

  const title = firstMeaningfulLine(edited, 120) ?? base.title;
  return {
    ...base,
    title,
    description: edited,
  };
}

/** Текст для POST /api/parent-drafts из starter (тот же формат, что в заметке). */
export function voiceStarterToCreateParentDraftInput(
  payload: VoiceStarterPayload
): CreateParentDraftPayload {
  const text = formatVoiceStarterForParentDraft(payload);
  const out: CreateParentDraftPayload = { text };
  if (payload.context?.playerId?.trim()) {
    out.playerId = payload.context.playerId.trim();
  }
  const vid = payload.originVoiceNoteId?.trim();
  if (vid) out.voiceNoteId = vid;
  return out;
}

export function voiceNoteToReportInput(
  note: VoiceNoteCreateSource
): CreateReportPayload {
  const payload = voiceNoteToStarterPayload(note, "report_draft");
  const report = voiceStarterToCreateReportInput(payload);
  const summary = trimOrNull(note.summary);
  const transcriptPreview = toTranscriptPreview(payload.transcript, 180);
  if (!summary && report.title === "Отчёт из голосовой заметки") {
    report.title = transcriptPreview || report.title;
  }
  return report;
}

export function voiceNoteToActionInput(
  note: VoiceNoteCreateSource
): CreateActionItemPayload {
  const payload = voiceNoteToStarterPayload(note, "action_item");
  const action = voiceStarterToCreateActionInput(payload);
  if (!trimOrNull(action.title)) {
    action.title = toTranscriptPreview(payload.transcript, 100) || "Задача из голосовой заметки";
  }
  return action;
}

export function voiceNoteToParentDraftInput(
  note: VoiceNoteCreateSource
): CreateParentDraftPayload {
  const payload = voiceNoteToStarterPayload(note, "parent_draft");
  const draft = voiceStarterToCreateParentDraftInput(payload);
  if (!trimOrNull(draft.text)) {
    draft.text = trimOrNull(note.summary) ?? toTranscriptPreview(payload.transcript, 600);
  }
  return draft;
}

export async function createReport(
  payload: CreateReportPayload
): Promise<VoiceCreateResult<CreatedReport>> {
  try {
    const data = await apiFetch<CreatedReport>("/api/reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

export async function createActionItem(
  payload: CreateActionItemPayload
): Promise<VoiceCreateResult<CreatedActionItem>> {
  try {
    const data = await apiFetch<CreatedActionItem>("/api/actions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

export async function createParentDraft(
  payload: CreateParentDraftPayload
): Promise<VoiceCreateResult<CreatedParentDraft>> {
  try {
    const data = await apiFetch<CreatedParentDraft>("/api/parent-drafts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toUserMessage(e) };
  }
}

import type { VoiceProcessingResult } from "../ai/types";
import { processVoiceNote } from "../ai/voiceProcessing";
import { VOICE_MVP_SOURCE } from "./constants";
import type { VoiceCoachDraft, VoiceCoachDraftContext } from "./types";

export type VoiceStarterIntent =
  | "coach_note"
  | "parent_draft"
  | "report_draft"
  | "action_item";

export interface VoiceStarterPayload {
  id: string;
  createdAt: string;
  originVoiceNoteId?: string;
  intent: VoiceStarterIntent;
  source: VoiceCoachDraft["source"];
  transcript: string;
  summary: string | null;
  highlights: string[];
  context?: VoiceCoachDraftContext;
  /** Optional локальная AI-обработка (`processVoiceNote`). Старые payload без поля продолжают работать. */
  aiProcessed?: VoiceProcessingResult;
}

/**
 * Обогащает starter результатом `processVoiceNote` (mock / будущий провайдер).
 * Если `payload.aiProcessed` уже задан (например handoff с voice-note), повторный вызов не делается.
 * При пустом transcript, ошибке или недоступности AI возвращает исходный payload.
 */
/** Стабильная подпись для handoff preview → starter (transcript + игрок). */
export function voiceStarterHandoffSignature(transcript: string, playerLabel?: string): string {
  return `${transcript.trim()}\0${playerLabel?.trim() ?? ""}`;
}

export async function enrichVoiceStarterWithAi(
  payload: VoiceStarterPayload
): Promise<VoiceStarterPayload> {
  if (payload.aiProcessed) {
    return payload;
  }
  if (!payload.transcript?.trim()) return payload;
  try {
    const aiProcessed = await processVoiceNote({
      text: payload.transcript,
      playerName: payload.context?.playerLabel,
    });
    return { ...payload, aiProcessed };
  } catch {
    return payload;
  }
}

export function buildVoiceStarterPayload(
  draft: VoiceCoachDraft,
  intent: VoiceStarterIntent
): VoiceStarterPayload {
  return {
    id: `voice_starter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    intent,
    source: draft.source,
    transcript: draft.transcript,
    summary: draft.summary ?? null,
    highlights: draft.extractedPoints ?? [],
    context: draft.context,
  };
}

/** Собирает starter из сохранённой заметки / backend recap (без полного VoiceCoachDraft). */
export function buildVoiceStarterFromVoiceRecap(params: {
  intent: VoiceStarterIntent;
  transcript: string;
  summary: string | null;
  highlights: string[];
  context?: VoiceCoachDraftContext;
  originVoiceNoteId?: string;
}): VoiceStarterPayload {
  const transcript = params.transcript.trim() || " ";
  return {
    id: `voice_starter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    originVoiceNoteId: params.originVoiceNoteId?.trim() || undefined,
    intent: params.intent,
    source: VOICE_MVP_SOURCE,
    transcript,
    summary: params.summary?.trim() ? params.summary.trim() : null,
    highlights: params.highlights.slice(0, 12),
    context: params.context,
  };
}

export function formatVoiceStarterForCoachNote(payload: VoiceStarterPayload): string {
  const lines: string[] = [];
  if (payload.summary?.trim()) {
    lines.push(payload.summary.trim());
  }
  if (payload.highlights.length > 0) {
    lines.push("", "Акценты:", ...payload.highlights.map((h) => `• ${h}`));
  }
  const cleanTranscript = payload.transcript.trim();
  if (cleanTranscript) {
    lines.push("", "Расшифровка:", cleanTranscript);
  }
  return lines.join("\n");
}

export function formatVoiceStarterForParentDraft(payload: VoiceStarterPayload): string {
  const fromAi = payload.aiProcessed?.parentDraft?.trim();
  if (fromAi) return fromAi;

  const player = payload.context?.playerLabel?.trim();
  const session = payload.context?.sessionHint?.trim();
  const intro = player
    ? `Коротко по тренировке для ${player}:`
    : "Коротко по тренировке:";
  const header = [intro, session ? `Сессия: ${session}` : null].filter(Boolean).join("\n");

  const body = payload.summary?.trim()
    ? payload.summary.trim()
    : payload.highlights.length > 0
      ? payload.highlights.map((h) => `• ${h}`).join("\n")
      : payload.transcript.trim();

  return [header, "", body].filter((x) => x != null && x !== "").join("\n");
}

export function formatVoiceStarterForReportDraft(payload: VoiceStarterPayload): string {
  const player = payload.context?.playerLabel?.trim() ?? "Игрок";
  const title = `Черновик отчёта: ${player}`;
  const blocks: string[] = [title];
  const ai = payload.aiProcessed;
  const hasAiBullets =
    ai &&
    (ai.strengths.length > 0 ||
      ai.improvements.length > 0 ||
      ai.recommendations.length > 0);

  if (ai?.summary?.trim()) {
    blocks.push("", ai.summary.trim());
  } else if (payload.summary?.trim()) {
    blocks.push("", payload.summary.trim());
  }

  if (hasAiBullets && ai) {
    if (ai.strengths.length > 0) {
      blocks.push("", "Сильные стороны:", ...ai.strengths.map((h) => `• ${h}`));
    }
    if (ai.improvements.length > 0) {
      blocks.push("", "Зоны роста:", ...ai.improvements.map((h) => `• ${h}`));
    }
    if (ai.recommendations.length > 0) {
      blocks.push("", "Рекомендации:", ...ai.recommendations.map((h) => `• ${h}`));
    }
  } else if (payload.highlights.length > 0) {
    blocks.push("", "Ключевые пункты:", ...payload.highlights.map((h) => `• ${h}`));
  }

  blocks.push("", "Заметки тренера:", payload.transcript.trim());
  return blocks.join("\n");
}

export function formatVoiceStarterForActionItem(payload: VoiceStarterPayload): string {
  const player = payload.context?.playerLabel?.trim();
  const prefix = player ? `Задача для ${player}: ` : "Задача: ";
  const firstAction = payload.aiProcessed?.actions?.[0]?.title?.trim();
  if (firstAction) {
    return `${prefix}${firstAction}`;
  }
  const base =
    payload.highlights[0]?.trim() ||
    payload.summary?.trim() ||
    payload.transcript.split("\n").map((s) => s.trim()).find(Boolean) ||
    "Уточнить детали";
  return `${prefix}${base}`;
}


/**
 * Deterministic local parser for hands-free navigation in continuous voice mode.
 * Only full-string matches after normalization — no NLU, no backend.
 */

export type ContinuousVoiceNavCommand = "next" | "fix" | "exit";

/** One-shot intent for "исправить" when navigating from voice-note (avoids fragile URL params). */
export const VOICE_SERIES_EDIT_LAST_STORAGE_KEY = "@hockey_voice_series_edit_last";

const EDIT_LAST_TTL_MS = 45_000;

export type VoiceSeriesEditLastPayload = { v: 1; ts: number };

export function buildVoiceSeriesEditLastPayload(): string {
  const payload: VoiceSeriesEditLastPayload = { v: 1, ts: Date.now() };
  return JSON.stringify(payload);
}

export function parseVoiceSeriesEditLastPayload(
  raw: string | null
): VoiceSeriesEditLastPayload | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (
      typeof o === "object" &&
      o !== null &&
      (o as VoiceSeriesEditLastPayload).v === 1 &&
      typeof (o as VoiceSeriesEditLastPayload).ts === "number"
    ) {
      return o as VoiceSeriesEditLastPayload;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isVoiceSeriesEditLastPayloadFresh(p: VoiceSeriesEditLastPayload): boolean {
  return Date.now() - p.ts <= EDIT_LAST_TTL_MS;
}

let lastVoiceNoteHandsFreeKey: string | null = null;

/** Dedupe hands-free actions (e.g. React Strict Mode double effect) per draft + transcript. */
export function tryConsumeVoiceNoteHandsFreeAction(
  draftId: string,
  transcript: string,
  cmd: ContinuousVoiceNavCommand
): boolean {
  const key = `${draftId}::${transcript}::${cmd}`;
  if (lastVoiceNoteHandsFreeKey === key) return false;
  lastVoiceNoteHandsFreeKey = key;
  return true;
}

export function resetVoiceNoteHandsFreeDedupe() {
  lastVoiceNoteHandsFreeKey = null;
}

const MAX_LEN = 48;

const NEXT_PHRASES = new Set<string>([
  "дальше",
  "следующая",
  "следующий",
  "следующее",
  "вперед",
  "следующая заметка",
  "следующая голосовая заметка",
  "еще одна",
  "ещё одна",
  "новая заметка",
]);

const FIX_PHRASES = new Set<string>([
  "исправить",
  "поправить",
  "исправить последнее",
  "вернуть последнее",
]);

const EXIT_PHRASES = new Set<string>([
  "выйти",
  "выход",
  "выйти из серии",
  "закончить серию",
  "закончить",
  "стоп серия",
]);

function normalizeCommandText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseContinuousVoiceCommand(raw: string): ContinuousVoiceNavCommand | null {
  const n = normalizeCommandText(raw);
  if (!n || n.length > MAX_LEN) return null;
  if (NEXT_PHRASES.has(n)) return "next";
  if (FIX_PHRASES.has(n)) return "fix";
  if (EXIT_PHRASES.has(n)) return "exit";
  return null;
}

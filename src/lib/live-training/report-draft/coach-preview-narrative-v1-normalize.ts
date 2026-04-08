/**
 * Канонический слой coachPreviewNarrativeV1: парсинг PATCH, нормализация для summaryJson,
 * обратная совместимость с legacy полем summaryLine у player highlights.
 */

import type {
  LiveTrainingCoachPreviewNarrativeMetaV1,
  LiveTrainingCoachPreviewNarrativeV1,
} from "@/lib/live-training/live-training-session-report-draft";
import { LiveTrainingHttpError } from "@/lib/live-training/http-error";

const MAX_SUMMARY_LINES = 24;
const MAX_FOCUS_AREAS = 10;
const MAX_PLAYER_HIGHLIGHT_ROWS = 20;
const MAX_LINE_CHARS = 2000;
const MAX_HIGHLIGHT_TEXT_CHARS = 4000;

/** После PATCH с полным телом narrative — все три слота помечаем как ручные (в т.ч. пустые после нормализации). */
export const COACH_PREVIEW_NARRATIVE_META_ALL_SLOTS_TOUCHED_V1: LiveTrainingCoachPreviewNarrativeMetaV1 = {
  sessionSummaryLinesManuallyEdited: true,
  focusAreasManuallyEdited: true,
  playerHighlightsManuallyEdited: true,
};

/**
 * Безопасный разбор meta из summaryJson. Невалидное / отсутствующее → все false (слоты разблокированы для гидратации).
 */
export function parseCoachPreviewNarrativeMetaV1(raw: unknown): LiveTrainingCoachPreviewNarrativeMetaV1 {
  if (!raw || typeof raw !== "object") {
    return {
      sessionSummaryLinesManuallyEdited: false,
      focusAreasManuallyEdited: false,
      playerHighlightsManuallyEdited: false,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    sessionSummaryLinesManuallyEdited: o.sessionSummaryLinesManuallyEdited === true,
    focusAreasManuallyEdited: o.focusAreasManuallyEdited === true,
    playerHighlightsManuallyEdited: o.playerHighlightsManuallyEdited === true,
  };
}

/** Текст акцента по игроку: канонически `text`, legacy `summaryLine`. */
export function playerHighlightBody(h: {
  text?: string | null;
  summaryLine?: string | null;
}): string {
  const t = typeof h.text === "string" ? h.text.trim() : "";
  if (t.length > 0) return t;
  const s = typeof h.summaryLine === "string" ? h.summaryLine.trim() : "";
  return s;
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Убирает пустые строки и подряд идущие дубликаты. */
export function normalizeStringLines(lines: unknown, cap: number): string[] {
  if (!Array.isArray(lines)) return [];
  const out: string[] = [];
  let prevNorm = "";
  for (const x of lines) {
    if (out.length >= cap) break;
    if (typeof x !== "string") continue;
    const t = clip(x, MAX_LINE_CHARS);
    if (!t) continue;
    const norm = t.toLowerCase();
    if (norm === prevNorm) continue;
    prevNorm = norm;
    out.push(t);
  }
  return out;
}

function normalizePlayerHighlightsFromUnknown(raw: unknown): LiveTrainingCoachPreviewNarrativeV1["playerHighlights"] {
  if (!Array.isArray(raw)) return [];
  const out: LiveTrainingCoachPreviewNarrativeV1["playerHighlights"] = [];
  for (const row of raw) {
    if (out.length >= MAX_PLAYER_HIGHLIGHT_ROWS) break;
    if (!row || typeof row !== "object") continue;
    const z = row as Record<string, unknown>;
    const text = clip(
      typeof z.text === "string"
        ? z.text
        : typeof z.summaryLine === "string"
          ? z.summaryLine
          : "",
      MAX_HIGHLIGHT_TEXT_CHARS
    );
    if (!text) continue;
    const item: LiveTrainingCoachPreviewNarrativeV1["playerHighlights"][number] = { text };
    if (typeof z.playerId === "string" && z.playerId.trim()) {
      item.playerId = z.playerId.trim();
    } else if (z.playerId === null) {
      item.playerId = null;
    }
    if (typeof z.playerName === "string" && z.playerName.trim()) {
      item.playerName = z.playerName.trim();
    } else if (z.playerName === null) {
      item.playerName = null;
    }
    out.push(item);
  }
  return out;
}

/**
 * Санитизация перед записью в Prisma (и для ответов): только канонические поля, без summaryLine.
 */
export function sanitizeCoachPreviewNarrativeV1(
  input: LiveTrainingCoachPreviewNarrativeV1
): LiveTrainingCoachPreviewNarrativeV1 {
  return {
    sessionSummaryLines: normalizeStringLines(input.sessionSummaryLines, MAX_SUMMARY_LINES),
    focusAreas: normalizeStringLines(input.focusAreas, MAX_FOCUS_AREAS),
    playerHighlights: normalizePlayerHighlightsFromUnknown(input.playerHighlights),
  };
}

/**
 * PATCH body: { sessionSummaryLines, focusAreas, playerHighlights } с полем text у highlights.
 */
/**
 * Достаточно ли сохранённого narrative для публикации в канонический отчёт (без гидратации Arena).
 */
export function hasPublishableCoachPreviewNarrativeV1(
  raw: LiveTrainingCoachPreviewNarrativeV1 | undefined | null
): boolean {
  if (!raw) return false;
  const n = sanitizeCoachPreviewNarrativeV1(raw);
  if (n.sessionSummaryLines.length > 0) return true;
  if (n.focusAreas.length > 0) return true;
  if (n.playerHighlights.some((h) => playerHighlightBody(h).trim().length > 0)) return true;
  return false;
}

export function parseCoachPreviewNarrativeFromRequestBody(raw: unknown): LiveTrainingCoachPreviewNarrativeV1 {
  if (raw == null || typeof raw !== "object") {
    throw new LiveTrainingHttpError("Ожидался объект coachPreviewNarrative", 400);
  }
  const o = raw as Record<string, unknown>;
  const draft: LiveTrainingCoachPreviewNarrativeV1 = {
    sessionSummaryLines: normalizeStringLines(o.sessionSummaryLines, MAX_SUMMARY_LINES),
    focusAreas: normalizeStringLines(o.focusAreas, MAX_FOCUS_AREAS),
    playerHighlights: normalizePlayerHighlightsFromUnknown(o.playerHighlights),
  };
  return sanitizeCoachPreviewNarrativeV1(draft);
}

/**
 * После чтения summaryJson из БД: привести highlights к каноническому `text` (legacy summaryLine).
 */
export function coerceCoachPreviewNarrativeInSummary<T extends { coachPreviewNarrativeV1?: LiveTrainingCoachPreviewNarrativeV1 }>(
  summary: T
): T {
  const n = summary.coachPreviewNarrativeV1;
  if (!n) return summary;
  const playerHighlights = (n.playerHighlights ?? []).map((h) => {
    const text = playerHighlightBody(h);
    const item: LiveTrainingCoachPreviewNarrativeV1["playerHighlights"][number] = { text };
    if (h.playerId !== undefined) item.playerId = h.playerId;
    if (h.playerName !== undefined) item.playerName = h.playerName;
    return item;
  });
  return {
    ...summary,
    coachPreviewNarrativeV1: {
      ...n,
      sessionSummaryLines: [...(n.sessionSummaryLines ?? [])],
      focusAreas: [...(n.focusAreas ?? [])],
      playerHighlights,
    },
  };
}

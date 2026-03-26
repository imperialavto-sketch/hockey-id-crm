import type { VoiceProcessingResult } from "./types";

function isPriority(v: unknown): v is "low" | "medium" | "high" {
  return v === "low" || v === "medium" || v === "high";
}

function parseStringArray(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function parseActions(raw: unknown): VoiceProcessingResult["actions"] {
  if (!Array.isArray(raw)) return [];
  const out: VoiceProcessingResult["actions"] = [];
  for (const item of raw.slice(0, 24)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!title) continue;
    const entry: { title: string; priority?: "low" | "medium" | "high" } = { title };
    if (isPriority(o.priority)) entry.priority = o.priority;
    out.push(entry);
  }
  return out;
}

/**
 * Мягко валидирует сохранённый server `analysisJson` / произвольный JSON.
 * Возвращает `null`, если структура не подходит под {@link VoiceProcessingResult}.
 */
export function parseAnalysisJsonToVoiceProcessingResult(
  raw: unknown
): VoiceProcessingResult | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  const parentDraft = typeof o.parentDraft === "string" ? o.parentDraft.trim() : "";
  const strengths = parseStringArray(o.strengths, 32);
  const improvements = parseStringArray(o.improvements, 32);
  const recommendations = parseStringArray(o.recommendations, 32);
  const actions = parseActions(o.actions);
  const hasSignal =
    summary.length > 0 ||
    parentDraft.length > 0 ||
    strengths.length > 0 ||
    improvements.length > 0 ||
    recommendations.length > 0 ||
    actions.length > 0;
  if (!hasSignal) return null;
  return {
    summary,
    strengths,
    improvements,
    recommendations,
    actions,
    parentDraft,
  };
}

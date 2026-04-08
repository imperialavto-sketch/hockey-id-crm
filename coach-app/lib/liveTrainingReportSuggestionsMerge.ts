/**
 * Встраивание подсказок из отчётов в planningSnapshot перед POST /live-training/sessions.
 * Только канонические suggestion-объекты из report-analytics; без персистенции задач.
 */

import type { CoachTaskSuggestion } from "@/services/coachPlayersService";
import type { LiveTrainingPlanningSnapshot } from "@/types/liveTraining";

function normTitle(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .slice(0, 160);
}

function maxInjectionsForConfidence(c: CoachTaskSuggestion["confidence"]): number {
  if (c === "low") return 2;
  if (c === "moderate") return 4;
  return 5;
}

function pickSuggestions(
  suggestions: CoachTaskSuggestion[],
  max: number
): CoachTaskSuggestion[] {
  const elevated = suggestions.filter((s) => s.priority === "elevated");
  const rest = suggestions.filter((s) => s.priority !== "elevated");
  const ordered = [...elevated, ...rest];
  const out: CoachTaskSuggestion[] = [];
  const seen = new Set<string>();
  for (const s of ordered) {
    const k = normTitle(s.title);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function domainKeyFromTitle(title: string, prefix: string): string {
  let h = 0;
  const t = title.slice(0, 80);
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return `${prefix}_${Math.abs(h).toString(36).slice(0, 8)}`;
}

/**
 * Клонирует снимок и добавляет до max глобальных вставок в focusDomains / reinforceAreas / summaryLines
 * плюс suggestionSeeds для трассировки.
 */
export function mergeReportTaskSuggestionsIntoPlanningSnapshot(
  snapshot: LiveTrainingPlanningSnapshot,
  suggestions: CoachTaskSuggestion[],
  confidence: CoachTaskSuggestion["confidence"]
): LiveTrainingPlanningSnapshot {
  const maxTotal = maxInjectionsForConfidence(confidence);
  const picked = pickSuggestions(suggestions, maxTotal);
  if (picked.length === 0) {
    return snapshot;
  }

  const focusDomains = [...snapshot.focusDomains];
  const reinforceAreas = [...snapshot.reinforceAreas];
  const summaryLines = [...snapshot.summaryLines];

  let nFocus = 0;
  let nReinf = 0;
  let nSum = 0;
  const perTypeCap = confidence === "low" ? 1 : 2;
  const trace: string[] = [];

  for (const s of picked) {
    const traceLine = `${s.type === "focus_for_next_session" ? "фокус" : s.type === "follow_up_check" ? "проверка" : "заметка"}: ${s.title}`;
    trace.push(traceLine.slice(0, 500));

    const label = s.title.trim().slice(0, 120);
    const reasonFull = (s.description?.trim() || s.title).trim().slice(0, 500);

    if (s.type === "focus_for_next_session" && nFocus < perTypeCap) {
      focusDomains.push({
        domain: domainKeyFromTitle(s.title, "report_next"),
        labelRu: label.length > 0 ? label : "Фокус из отчётов",
        reason: reasonFull || "—",
        priority: s.priority === "elevated" ? "high" : "medium",
      });
      nFocus += 1;
      continue;
    }
    if (s.type === "follow_up_check" && nReinf < perTypeCap) {
      reinforceAreas.push({
        domain: domainKeyFromTitle(s.title, "report_followup"),
        labelRu: label.length > 0 ? label : "Проверка из отчётов",
        reason: reasonFull || "Ориентир из отчётов по тренировкам.",
      });
      nReinf += 1;
      continue;
    }
    if (s.type === "development_note" && nSum < perTypeCap) {
      summaryLines.push(`[Отчёты] ${s.title.trim().slice(0, 400)}`);
      nSum += 1;
      continue;
    }
    if (s.type === "follow_up_check" && nSum < perTypeCap) {
      summaryLines.push(`[Отчёты · проверка] ${s.title.trim().slice(0, 400)}`);
      nSum += 1;
      continue;
    }
    if (nFocus < perTypeCap) {
      focusDomains.push({
        domain: domainKeyFromTitle(s.title, "report_hint"),
        labelRu: label.length > 0 ? label : "Ориентир из отчётов",
        reason: reasonFull || "—",
        priority: "medium",
      });
      nFocus += 1;
    } else if (nReinf < perTypeCap) {
      reinforceAreas.push({
        domain: domainKeyFromTitle(s.title, "report_hint_r"),
        labelRu: label.length > 0 ? label : "Дожим из отчётов",
        reason: reasonFull || "—",
      });
      nReinf += 1;
    } else if (nSum < perTypeCap) {
      summaryLines.push(`[Отчёты] ${s.title.trim().slice(0, 400)}`);
      nSum += 1;
    }
  }

  return {
    ...snapshot,
    focusDomains,
    reinforceAreas,
    summaryLines,
    suggestionSeeds: {
      source: "report_action_layer",
      items: trace.slice(0, 8),
    },
  };
}

/**
 * Операционные подсказки-«задачи» из аналитики отчётов + action layer.
 * Только объекты для чтения; персистенции нет.
 */

import type { CoachTrainingSessionReportAnalyticsDto } from "./training-session-report-analytics";
import type { CoachTrainingSessionReportActionLayerDto } from "./training-session-report-action-layer";

export type CoachTaskSuggestionDto = {
  id: string;
  type: "focus_for_next_session" | "development_note" | "follow_up_check";
  title: string;
  description?: string;
  source: "report_action_layer";
  confidence: "low" | "moderate" | "high";
  priority: "normal" | "elevated";
};

export type CoachTaskSuggestionsFromReportsDto = {
  suggestions: CoachTaskSuggestionDto[];
  rationale?: string[];
};

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .slice(0, 120);
}

function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 10);
}

function makeId(type: CoachTaskSuggestionDto["type"], title: string): string {
  return `rpt_${type}_${shortHash(`${type}:${normKey(title)}`)}`;
}

const TITLE_SOFT_PREFIX = "По желанию: ";

/** Короткий заголовок + при необходимости полный текст в описании. */
function titleAndDescription(line: string, titleMax = 76): { title: string; description?: string } {
  const raw = line.trim();
  if (raw.length <= titleMax) {
    return { title: raw };
  }
  let cut = raw.slice(0, titleMax);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 44) cut = cut.slice(0, lastSpace);
  const title = `${cut.trim()}…`;
  return { title, description: raw };
}

function maxSuggestions(
  actionConfidence: CoachTrainingSessionReportActionLayerDto["confidence"]
): number {
  if (actionConfidence === "low") return 3;
  if (actionConfidence === "moderate") return 5;
  return 6;
}

/**
 * Собирает 3–6 подсказок из actionLayer; analytics — для лёгкого уточнения типов и rationale.
 */
export function buildCoachTaskSuggestionsFromReports(
  analytics: CoachTrainingSessionReportAnalyticsDto,
  actionLayer: CoachTrainingSessionReportActionLayerDto
): CoachTaskSuggestionsFromReportsDto {
  const cap = maxSuggestions(actionLayer.confidence);
  const seen = new Set<string>();
  const suggestions: CoachTaskSuggestionDto[] = [];

  const conf = actionLayer.confidence;

  const push = (input: {
    type: CoachTaskSuggestionDto["type"];
    priority: CoachTaskSuggestionDto["priority"];
    line: string;
    soft?: boolean;
  }) => {
    if (suggestions.length >= cap) return;
    const base = input.soft && conf === "low" ? `${TITLE_SOFT_PREFIX}${input.line}` : input.line;
    const { title, description } = titleAndDescription(base);
    const k = normKey(title);
    if (!k || seen.has(k)) return;
    seen.add(k);
    suggestions.push({
      id: makeId(input.type, title),
      type: input.type,
      title,
      description,
      source: "report_action_layer",
      confidence: conf,
      priority: input.priority,
    });
  };

  actionLayer.priorityActions.forEach((line, idx) => {
    const elevated = conf !== "low" || idx === 0;
    push({
      type: "follow_up_check",
      priority: elevated ? "elevated" : "normal",
      line,
      soft: conf === "low",
    });
  });

  for (const line of actionLayer.nextSessionFocus) {
    push({
      type: "focus_for_next_session",
      priority: "normal",
      line,
      soft: conf === "low",
    });
  }

  for (const line of actionLayer.reinforcementAreas) {
    const lower = line.toLowerCase();
    const asCheck =
      lower.includes("сверьтесь") ||
      lower.includes("синхрониз") ||
      lower.includes("проверьте") ||
      lower.includes("уточните на льду");
    push({
      type: asCheck ? "follow_up_check" : "development_note",
      priority: "normal",
      line,
      soft: conf === "low",
    });
  }

  if (
    suggestions.length < cap &&
    conf !== "low" &&
    analytics.attentionSignals.length === 1 &&
    analytics.recentTrend.kind === "improving"
  ) {
    const a = analytics.attentionSignals[0]!;
    const line = `Повторяющаяся тема в отчётах («${a.label.slice(0, 80)}${a.label.length > 80 ? "…" : ""}») — имеет смысл коротко проверить на следующей тренировке, не ломая общий позитивный тон формулировок.`;
    push({ type: "follow_up_check", priority: "normal", line });
  }

  const rationale: string[] = [
    "Черновые идеи для заметок, плана сессии или live training — без автоматического создания задач в CRM.",
  ];
  if (actionLayer.rationale?.length) {
    rationale.push(...actionLayer.rationale.slice(0, 2));
  }

  return { suggestions, rationale };
}

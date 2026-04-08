/**
 * Контекст для review: что из CRM-отчётов было подмешано в planning snapshot до старта.
 * Не утверждает причинность исходов — только видимость и преемственность.
 */

import type { LiveTrainingPlanningSnapshot } from "@/types/liveTraining";

/** Префиксы domain id, выставляемые mergeReportTaskSuggestionsIntoPlanningSnapshot. */
export const REPORT_PLANNING_TRACE_PREFIXES = {
  focusNext: "report_next_",
  /** Общий префикс «hint» в фокусе; не путать с `report_hint_r_` (закрепление). */
  focusHint: "report_hint_",
  followup: "report_followup_",
  reinforceHint: "report_hint_r_",
} as const;

function isReportTracedFocusDomain(domain: string): boolean {
  if (domain.startsWith(REPORT_PLANNING_TRACE_PREFIXES.reinforceHint)) return false;
  if (domain.startsWith(REPORT_PLANNING_TRACE_PREFIXES.focusNext)) return true;
  return domain.startsWith(REPORT_PLANNING_TRACE_PREFIXES.focusHint);
}

function isReportTracedReinforce(domain: string): boolean {
  return (
    domain.startsWith(REPORT_PLANNING_TRACE_PREFIXES.followup) ||
    domain.startsWith(REPORT_PLANNING_TRACE_PREFIXES.reinforceHint)
  );
}

function isReportTracedSummaryLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("[Отчёты]") || t.startsWith("[Отчёты · проверка]");
}

export type LiveTrainingReviewReportPlanningLineVm = {
  primary: string;
  secondary?: string;
};

export type LiveTrainingReviewReportPlanningVm = {
  /** Короткие строки-трассы из suggestionSeeds (если были). */
  seedLines: string[];
  /** Темы из focusDomains с report_* id. */
  focusFromReports: LiveTrainingReviewReportPlanningLineVm[];
  /** Закрепление / дожим из reinforceAreas с report_* id. */
  reinforceFromReports: LiveTrainingReviewReportPlanningLineVm[];
  /** Строки сводки с префиксом [Отчёты]. */
  reportSummaryLines: string[];
};

const MAX_SEEDS = 6;
const MAX_FOCUS = 4;
const MAX_REINF = 4;
const MAX_SUMMARY = 4;

/**
 * Возвращает null, если в снимке нет безопасно различимых следов отчётов.
 */
export function buildLiveTrainingReviewReportPlanningVm(
  snap: LiveTrainingPlanningSnapshot | null | undefined
): LiveTrainingReviewReportPlanningVm | null {
  if (!snap) return null;

  const seedLines =
    snap.suggestionSeeds?.source === "report_action_layer" &&
    Array.isArray(snap.suggestionSeeds.items)
      ? snap.suggestionSeeds.items
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, MAX_SEEDS)
      : [];

  const focusFromReports: LiveTrainingReviewReportPlanningLineVm[] = [];
  for (const d of snap.focusDomains ?? []) {
    if (!isReportTracedFocusDomain(d.domain)) continue;
    if (focusFromReports.length >= MAX_FOCUS) break;
    const primary = d.labelRu?.trim() || d.domain;
    const reason = d.reason?.trim();
    focusFromReports.push({
      primary,
      secondary:
        reason && reason !== "—" && reason !== primary
          ? reason.length > 160
            ? `${reason.slice(0, 157)}…`
            : reason
          : undefined,
    });
  }

  const reinforceFromReports: LiveTrainingReviewReportPlanningLineVm[] = [];
  for (const r of snap.reinforceAreas ?? []) {
    if (!isReportTracedReinforce(r.domain)) continue;
    if (reinforceFromReports.length >= MAX_REINF) break;
    const primary = r.labelRu?.trim() || r.domain;
    const reason = r.reason?.trim();
    reinforceFromReports.push({
      primary,
      secondary:
        reason && reason !== "—" && reason !== primary
          ? reason.length > 160
            ? `${reason.slice(0, 157)}…`
            : reason
          : undefined,
    });
  }

  const reportSummaryLines = (snap.summaryLines ?? [])
    .map((s) => s.trim())
    .filter(isReportTracedSummaryLine)
    .slice(0, MAX_SUMMARY);

  const hasBody =
    seedLines.length > 0 ||
    focusFromReports.length > 0 ||
    reinforceFromReports.length > 0 ||
    reportSummaryLines.length > 0;

  if (!hasBody) return null;

  return {
    seedLines,
    focusFromReports,
    reinforceFromReports,
    reportSummaryLines,
  };
}

export const LIVE_TRAINING_REVIEW_REPORT_PLANNING_COPY = {
  sectionTitle: "Что брали в тренировку из прошлых отчётов",
  sectionSub:
    "Это ориентиры из CRM, зафиксированные до старта сессии. Не итог тренировки и не оценка того, «сработало» ли что-то.",
  seedsKicker: "Краткая трасса подсказок",
  focusKicker: "Темы (из отчётов)",
  reinforceKicker: "Закрепление / проверка (из отчётов)",
  summaryKicker: "Строки в сводке плана",
  hintCompare:
    "Сравните с тем, что реально проявилось на льду — расхождения нормальны.",
  hintReport:
    "Не всё из списка обязано попасть в финальный отчёт: это опора для проверки, а не чек-лист результата.",
} as const;

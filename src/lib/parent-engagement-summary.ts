/**
 * Компактные «крючки» удержания для родителя — только из уже родительских данных (отчёты + сводка развития).
 */

import type { ParentPlayerDevelopmentSummaryDto } from "./parent-player-development-summary";

export type ParentEngagementSummaryDto = {
  recentFocusHeadline?: string;
  progressCue?: string;
  nextAttentionCue?: string;
  /** Всегда есть хотя бы одна спокойная строка-якорь. */
  encouragementLine: string;
};

type LatestReportSlice = {
  parentMessage?: string | null;
  focusAreas?: string | null;
  summary?: string | null;
} | null;

function trimSoft(s: string, max: number): string {
  const x = s.trim().replace(/\s+/gu, " ");
  if (x.length <= max) return x;
  return `${x.slice(0, max - 1)}…`;
}

function firstMeaningfulLine(raw: string | null | undefined, max: number): string | undefined {
  if (!raw?.trim()) return undefined;
  const line = raw
    .split(/\r?\n/u)
    .map((x) => x.trim())
    .find((x) => x.length > 3);
  if (!line) return undefined;
  return trimSoft(line, max);
}

function normKey(s: string): string {
  return s.toLowerCase().replace(/\s+/gu, " ").slice(0, 64);
}

/**
 * @param recentPublishedReportCount — число тренировок с непустым родительским отчётом (канонический список).
 */
export function buildParentEngagementSummary(input: {
  latestSessionReport: LatestReportSlice;
  parentDevelopmentSummary: ParentPlayerDevelopmentSummaryDto;
  recentPublishedReportCount: number;
}): ParentEngagementSummaryDto {
  const dev = input.parentDevelopmentSummary;
  const report = input.latestSessionReport;
  const count = Math.max(0, Math.floor(input.recentPublishedReportCount));

  let recentFocusHeadline: string | undefined;
  const pm = firstMeaningfulLine(report?.parentMessage ?? null, 78);
  const fa = firstMeaningfulLine(report?.focusAreas ?? null, 78);
  const sumLine = firstMeaningfulLine(report?.summary ?? null, 78);
  const mf0 = dev.mainFocus[0]?.trim();

  if (pm) recentFocusHeadline = pm;
  else if (fa) recentFocusHeadline = fa;
  else if (mf0) recentFocusHeadline = trimSoft(mf0, 78);
  else if (sumLine) recentFocusHeadline = sumLine;

  const trend = dev.positiveTrend?.trim();
  const attention = dev.attentionArea?.trim();
  const bothTrendAndAttention = Boolean(trend && attention);

  let progressCue: string | undefined;
  if (trend && !bothTrendAndAttention) {
    progressCue = trimSoft(trend, 118);
  } else if (bothTrendAndAttention) {
    progressCue =
      "Картина живая: есть опоры и аккуратные акценты — подробности в сводке ниже и в отчёте тренера.";
  } else if (count >= 2) {
    progressCue =
      "Несколько последних занятий уже отражены в приложении — удобно иногда возвращаться к записям.";
  } else if (count === 1 && report) {
    progressCue = "Свежий итог последней тренировки — чуть ниже, в спокойном формате без спешки.";
  } else if (mf0 && !recentFocusHeadline) {
    progressCue = trimSoft(`В фокусе тренировок: ${mf0}`, 118);
  }

  let nextAttentionCue: string | undefined;
  if (attention) {
    nextAttentionCue = trimSoft(attention, 118);
  } else if (fa && normKey(fa) !== normKey(recentFocusHeadline ?? "")) {
    nextAttentionCue = trimSoft(fa, 112);
  } else if (dev.mainFocus[1]?.trim()) {
    nextAttentionCue = trimSoft(dev.mainFocus[1], 112);
  }

  const lowHistory = count <= 1 && dev.mainFocus.length === 0 && !pm && !fa;
  const encouragementLine = lowHistory
    ? "Как только тренер оставит итог занятия, здесь появится короткий ориентир — без давления и сравнений."
    : "Заглядывайте сюда после тренировок: мы держим тон спокойным и уважительным — без гонки за баллами.";

  if (progressCue && normKey(progressCue) === normKey(recentFocusHeadline ?? "")) {
    progressCue = undefined;
  }
  if (nextAttentionCue && normKey(nextAttentionCue) === normKey(recentFocusHeadline ?? "")) {
    nextAttentionCue = undefined;
  }
  if (nextAttentionCue && progressCue && normKey(nextAttentionCue) === normKey(progressCue)) {
    nextAttentionCue = undefined;
  }

  return {
    recentFocusHeadline,
    progressCue,
    nextAttentionCue,
    encouragementLine,
  };
}

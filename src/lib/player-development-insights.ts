/**
 * Сводка «развитие игрока» из уже собранных отчётов и live-сигналов (без новых сущностей в БД).
 */

import type { ApiUser } from "./api-auth";
import { getPlayerLiveTrainingSignalsBundle } from "./live-training/get-coach-player-live-training-signals";
import type { PlayerLiveTrainingSignalsBundleDto } from "./live-training/get-coach-player-live-training-signals";
import { computeTrainingSessionReportAnalytics } from "./training-session-report-analytics";
import {
  listCoachPublishedTrainingSessionReportAnalyticsInputForPlayer,
  listParentPublishedTrainingSessionReportAnalyticsInputForPlayer,
  type PublishedTrainingSessionReportHistoryAnalyticsRow,
} from "./training-session-published-report-history";

export type PlayerDevelopmentInsightDto = {
  recurringThemes: string[];
  recentFocus: string[];
  attentionSignals: string[];
  momentum: "up" | "stable" | "mixed";
  confidence: "low" | "moderate" | "high";
  /** Одна нейтральная строка-резюме без оценки «хорошо/плохо». */
  summaryLine?: string;
};

const MAX_LINES = 4;

function dedupeLines(lines: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const s = raw.trim();
    if (!s) continue;
    const k = s.toLowerCase().replace(/\s+/gu, " ").slice(0, 96);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s.length > 110 ? `${s.slice(0, 107)}…` : s);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Общее ядро: строки отчётов (уже отфильтрованы по правам вызывающего) + bundle live-сигналов.
 */
export function computePlayerDevelopmentInsightDto(
  reportRows: PublishedTrainingSessionReportHistoryAnalyticsRow[],
  liveBundle: PlayerLiveTrainingSignalsBundleDto
): PlayerDevelopmentInsightDto {
  const analytics = computeTrainingSessionReportAnalytics(reportRows);
  const trend = analytics.recentTrend;
  const ts = liveBundle.trendSummary;
  const sum = liveBundle.summary;

  let recurringThemes = dedupeLines(
    analytics.recurringFocusThemes.map((t) => t.label.trim()).filter(Boolean),
    MAX_LINES
  );
  if (recurringThemes.length === 0) {
    recurringThemes = dedupeLines(
      sum.domainBuckets.map((b) => b.domainLabelRu),
      MAX_LINES
    );
  }

  const recentFocusRaw: string[] = [];
  for (const d of ts.dominantPositiveDomains.slice(0, 3)) {
    recentFocusRaw.push(d.domainLabelRu);
  }
  for (const s of liveBundle.latestSignals) {
    const line =
      s.topicLabelRu && s.topicLabelRu !== s.domainLabelRu
        ? `${s.domainLabelRu}: ${s.topicLabelRu}`
        : s.domainLabelRu;
    recentFocusRaw.push(line);
  }
  const recentFocus = dedupeLines(recentFocusRaw, MAX_LINES);

  const attentionRaw: string[] = [];
  for (const a of analytics.attentionSignals) {
    const h = a.hint?.trim();
    attentionRaw.push(h ? `${a.label.trim()} — ${h.slice(0, 72)}` : a.label.trim());
  }
  for (const r of ts.repeatedAttentionAreas) {
    attentionRaw.push(`Повторные «внимание»: ${r.domainLabelRu}`);
  }
  for (const d of ts.dominantNegativeDomains.slice(0, 2)) {
    attentionRaw.push(`Недавний акцент «внимание»: ${d.domainLabelRu}`);
  }
  const attentionSignals = dedupeLines(attentionRaw, MAX_LINES);

  let momentum: "up" | "stable" | "mixed" = "stable";
  if (analytics.reportCount >= 2) {
    if (trend.kind === "improving") momentum = "up";
    else if (trend.kind === "mixed") momentum = "mixed";
    else momentum = "stable";
  } else if (!ts.insufficientForPatterns && sum.totalSignals >= 6) {
    const pos = sum.positiveCount;
    const neg = sum.negativeCount;
    if (pos > neg * 1.35) momentum = "up";
    else if (neg > pos * 1.05) momentum = "mixed";
  }

  let confidence: "low" | "moderate" | "high" = "low";
  if (analytics.dataSufficiency === "rich" && sum.totalSignals >= 8) {
    confidence = "high";
  } else if (analytics.dataSufficiency === "moderate" || sum.totalSignals >= 5) {
    confidence = "moderate";
  } else if (analytics.reportCount === 0 && sum.totalSignals < 4) {
    confidence = "low";
  } else {
    confidence = "moderate";
  }

  let summaryLine: string | undefined;
  if (ts.insufficientForPatterns && sum.totalSignals > 0) {
    summaryLine =
      "Мало недавних сигналов для устойчивого паттерна — картина может меняться от тренировки к тренировке.";
  } else if (analytics.reportCount >= 2 && trend.summaryLine?.trim()) {
    summaryLine = trend.summaryLine.trim().slice(0, 220);
  } else if (sum.totalSignals > 0) {
    summaryLine = `Live-сигналы: плюс ${sum.positiveCount}, внимание ${sum.negativeCount}, нейтрально ${sum.neutralCount} (по подтверждённым сессиям).`;
  } else if (analytics.reportCount === 0 && sum.totalSignals === 0) {
    summaryLine =
      "Пока мало данных в отчётах и сигналах — сводка станет плотнее после нескольких зафиксированных тренировок.";
  }

  return {
    recurringThemes,
    recentFocus,
    attentionSignals,
    momentum,
    confidence,
    summaryLine,
  };
}

/**
 * Агрегирует канонические отчёты (как report-analytics) + сигналы live training по игроку.
 */
export async function buildPlayerDevelopmentInsightsForCoach(
  user: ApiUser,
  playerId: string
): Promise<PlayerDevelopmentInsightDto> {
  const [reportRows, liveBundle] = await Promise.all([
    listCoachPublishedTrainingSessionReportAnalyticsInputForPlayer(user, playerId),
    getPlayerLiveTrainingSignalsBundle(playerId),
  ]);
  return computePlayerDevelopmentInsightDto(reportRows, liveBundle);
}

/**
 * Та же логика агрегации, но строки отчётов — в рамках доступа родителя к игроку.
 */
export async function buildPlayerDevelopmentInsightsForParent(
  parentId: string,
  playerId: string
): Promise<PlayerDevelopmentInsightDto> {
  const [reportRows, liveBundle] = await Promise.all([
    listParentPublishedTrainingSessionReportAnalyticsInputForPlayer(parentId, playerId),
    getPlayerLiveTrainingSignalsBundle(playerId),
  ]);
  return computePlayerDevelopmentInsightDto(reportRows, liveBundle);
}

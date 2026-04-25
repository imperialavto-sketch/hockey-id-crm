/**
 * DTO + deterministic copy for planned-vs-observed live fact (no Prisma import — safe for client bundles).
 */

export type ArenaPlannedVsObservedComparisonStatusDto =
  | "aligned"
  | "mixed"
  | "diverged"
  | "insufficient_data";

export type TeamPlannedVsObservedSummaryDto = {
  liveTrainingSessionId: string;
  comparisonStatus: ArenaPlannedVsObservedComparisonStatusDto;
  comparisonLabelRu: string;
  plannedFocusText: string | null;
  observedFocusText: string | null;
  positiveSignalCount: number;
  negativeSignalCount: number;
  observedDomainsJson: unknown;
  factCreatedAt: string;
  liveConfirmedAt: string | null;
};

/** Compact row for CRM history (GET /api/teams/[id], additive). */
export type TeamPlannedVsObservedHistoryRowDto = {
  liveTrainingSessionId: string;
  comparisonStatus: ArenaPlannedVsObservedComparisonStatusDto;
  comparisonLabelRu: string;
  plannedShort: string | null;
  observedShort: string | null;
  positiveSignalCount: number;
  negativeSignalCount: number;
  factCreatedAt: string;
  liveConfirmedAt: string | null;
};

function clipOneLine(s: string | null, maxChars: number): string | null {
  if (s == null) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= maxChars ? t : `${t.slice(0, maxChars - 1)}…`;
}

export function toTeamPlannedVsObservedHistoryRowDto(
  summary: TeamPlannedVsObservedSummaryDto,
  maxChars = 72
): TeamPlannedVsObservedHistoryRowDto {
  return {
    liveTrainingSessionId: summary.liveTrainingSessionId,
    comparisonStatus: summary.comparisonStatus,
    comparisonLabelRu: summary.comparisonLabelRu,
    plannedShort: clipOneLine(summary.plannedFocusText, maxChars),
    observedShort: clipOneLine(summary.observedFocusText, maxChars),
    positiveSignalCount: summary.positiveSignalCount,
    negativeSignalCount: summary.negativeSignalCount,
    factCreatedAt: summary.factCreatedAt,
    liveConfirmedAt: summary.liveConfirmedAt,
  };
}

export function arenaPlannedVsObservedComparisonLabelRu(
  status: ArenaPlannedVsObservedComparisonStatusDto
): string {
  switch (status) {
    case "aligned":
      return "Совпадение плана и наблюдений";
    case "mixed":
      return "Смешанный сигнал";
    case "diverged":
      return "План и наблюдения расходятся";
    case "insufficient_data":
      return "Недостаточно данных для сравнения";
  }
}

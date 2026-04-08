/**
 * Сессионная сводка для родителя (детерминированные шаблоны, без рекомендаций).
 */

export type ArenaParentProgressState = "positive" | "mixed" | "attention";

export type ArenaParentSummary = {
  summaryTitle: string;
  summaryText: string;
  progressState: ArenaParentProgressState;
};

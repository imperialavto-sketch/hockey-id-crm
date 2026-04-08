/**
 * PHASE 47: компактные rule-based сигналы по недавней истории continuity (без LLM, без «оценки тренера»).
 * Только паттерны закрытия приоритетов и переносов.
 */

import type { ExecutionPressureMode } from "./liveTrainingAdaptivePlanning";
import type { LiveTrainingContinuitySnapshotDto } from "./live-training-continuity-lock-in";
import type { LiveTrainingPriorityAlignmentReviewDto } from "./liveTrainingPriorityReviewScorer";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";

export type CoachIntelligenceSignalType =
  | "repeated_player_gap"
  | "repeated_domain_gap"
  | "repeated_reinforcement_gap"
  | "weak_execution_streak"
  | "carry_forward_pressure";

export type CoachIntelligenceSignalSeverity = "low" | "medium" | "high";

export type CoachIntelligenceSignal = {
  type: CoachIntelligenceSignalType;
  severity: CoachIntelligenceSignalSeverity;
  playerIds?: string[];
  domains?: string[];
  count?: number;
  explanation: string;
};

export type LiveTrainingCoachIntelligenceDto = {
  signals: CoachIntelligenceSignal[];
  summaryLines: string[];
  executionPressureMode: ExecutionPressureMode;
};

function norm(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function isActionableReview(
  par: LiveTrainingPriorityAlignmentReviewDto | null | undefined
): par is LiveTrainingPriorityAlignmentReviewDto {
  if (!par || !par.evaluationApplied || par.skippedNoTargets) return false;
  if (par.alignmentBand === "not_applicable") return false;
  return (
    par.alignmentBand === "strong" ||
    par.alignmentBand === "partial" ||
    par.alignmentBand === "weak"
  );
}

function uncoveredTotals(par: LiveTrainingPriorityAlignmentReviewDto): {
  players: string[];
  domains: string[];
  reinforcement: string[];
} {
  const pu = Array.isArray(par.uncoveredPlayers) ? par.uncoveredPlayers : [];
  const ud = Array.isArray(par.uncoveredDomains) ? par.uncoveredDomains : [];
  const ur = Array.isArray(par.uncoveredReinforcement) ? par.uncoveredReinforcement : [];
  return {
    players: [...new Set(pu.map(norm).filter(Boolean))],
    domains: [...new Set(ud.map(norm).filter(Boolean))],
    reinforcement: [...new Set(ur.map(norm).filter(Boolean))],
  };
}

function hasAnyUncovered(par: LiveTrainingPriorityAlignmentReviewDto): boolean {
  const u = uncoveredTotals(par);
  return u.players.length + u.domains.length + u.reinforcement.length > 0;
}

/**
 * Анализ последних N снимков (порядок: от новой к старой, как из БД).
 */
export function buildLiveTrainingCoachIntelligence(params: {
  recentContinuitySnapshots: LiveTrainingContinuitySnapshotDto[];
  nameById: Map<string, string>;
}): LiveTrainingCoachIntelligenceDto {
  const { recentContinuitySnapshots, nameById } = params;
  const signals: CoachIntelligenceSignal[] = [];
  const summaryLines: string[] = [];

  if (recentContinuitySnapshots.length === 0) {
    return { signals: [], summaryLines: [], executionPressureMode: "normal" };
  }

  const actionable: LiveTrainingPriorityAlignmentReviewDto[] = [];
  for (const snap of recentContinuitySnapshots) {
    const par = snap.priorityAlignmentReview;
    if (isActionableReview(par)) actionable.push(par);
  }

  if (actionable.length === 0) {
    return { signals: [], summaryLines: [], executionPressureMode: "normal" };
  }

  /** A–C: повторяющиеся пробелы по id в 2+ разных сессиях */
  const playerSessionHits = new Map<string, number>();
  const domainSessionHits = new Map<string, number>();
  const reinfSessionHits = new Map<string, number>();

  for (const par of actionable) {
    const u = uncoveredTotals(par);
    for (const pid of u.players) {
      playerSessionHits.set(pid, (playerSessionHits.get(pid) ?? 0) + 1);
    }
    for (const d of u.domains) {
      domainSessionHits.set(d, (domainSessionHits.get(d) ?? 0) + 1);
    }
    for (const d of u.reinforcement) {
      reinfSessionHits.set(d, (reinfSessionHits.get(d) ?? 0) + 1);
    }
  }

  for (const [playerId, c] of playerSessionHits) {
    if (c < 2) continue;
    const sev: CoachIntelligenceSignalSeverity = c >= 3 ? "high" : "medium";
    const nm = nameById.get(playerId)?.trim().split(/\s+/)[0] || "игрок";
    signals.push({
      type: "repeated_player_gap",
      severity: sev,
      playerIds: [playerId],
      count: c,
      explanation: `Тема приоритета по ${nm} всплывала без сигнала в ${c} недавних стартах — имеет смысл сознательно вернуться к работе с ним.`,
    });
  }

  for (const [domain, c] of domainSessionHits) {
    if (c < 2) continue;
    const sev: CoachIntelligenceSignalSeverity = c >= 3 ? "high" : "medium";
    const label = liveTrainingMetricDomainLabelRu(domain);
    signals.push({
      type: "repeated_domain_gap",
      severity: sev,
      domains: [domain],
      count: c,
      explanation: `Тема «${label}» неоднократно оставалась без сигнала в недавних стартах (${c}).`,
    });
  }

  for (const [domain, c] of reinfSessionHits) {
    if (c < 2) continue;
    const sev: CoachIntelligenceSignalSeverity = c >= 3 ? "high" : "medium";
    const label = liveTrainingMetricDomainLabelRu(domain);
    signals.push({
      type: "repeated_reinforcement_gap",
      severity: sev,
      domains: [domain],
      count: c,
      explanation: `Закрепление по «${label}» повторно не получило сигнал в ${c} стартах.`,
    });
  }

  /** D: серия слабого / нестабильного закрытия */
  let weakN = 0;
  let partialN = 0;
  let strongN = 0;
  for (const par of actionable) {
    if (par.alignmentBand === "weak") weakN += 1;
    else if (par.alignmentBand === "partial") partialN += 1;
    else strongN += 1;
  }

  if (weakN >= 2) {
    signals.push({
      type: "weak_execution_streak",
      severity: "high",
      count: weakN,
      explanation: `В ${weakN} из последних разборов закрытие приоритетов было слабым — следующий старт лучше упростить и закрепить фокус.`,
    });
  } else if (weakN === 1 && partialN >= 1 && actionable.length >= 2) {
    signals.push({
      type: "weak_execution_streak",
      severity: "medium",
      count: weakN + partialN,
      explanation:
        "Смесь слабого и частичного закрытия в недавних стартах — стоит проверить, что приоритеты реально доводятся до сигналов.",
    });
  } else if (partialN >= 2 && weakN === 0 && strongN === 0 && actionable.length >= 2) {
    signals.push({
      type: "weak_execution_streak",
      severity: "low",
      count: partialN,
      explanation:
        "Несколько стартов подряд закрыты частично — можно чуть яснее фиксировать темы на поле.",
    });
  }

  /** E: давление переносов — незакрытые приоритеты в нескольких сессиях */
  let sessionsWithUncovered = 0;
  for (const par of actionable) {
    if (hasAnyUncovered(par)) sessionsWithUncovered += 1;
  }
  if (sessionsWithUncovered >= 3) {
    signals.push({
      type: "carry_forward_pressure",
      severity: "high",
      count: sessionsWithUncovered,
      explanation:
        "В нескольких последних стартах оставались незакрытые приоритеты — нагрузка на перенос высокая.",
    });
  } else if (sessionsWithUncovered >= 2) {
    signals.push({
      type: "carry_forward_pressure",
      severity: "medium",
      count: sessionsWithUncovered,
      explanation:
        "Незакрытые приоритеты встречались в двух недавних стартах — полезно заранее выбрать, что добираем в первую очередь.",
    });
  }

  /** Сортировка: high → medium → low, затем тип */
  const rank: Record<CoachIntelligenceSignalSeverity, number> = { high: 3, medium: 2, low: 1 };
  signals.sort((a, b) => rank[b.severity] - rank[a.severity] || a.type.localeCompare(b.type));

  const top = signals.slice(0, 2);
  for (const s of top) {
    summaryLines.push(s.explanation);
  }

  let executionPressureMode: ExecutionPressureMode = "normal";
  const hasHigh = signals.some((s) => s.severity === "high");
  const hasMedium = signals.some((s) => s.severity === "medium");
  if (hasHigh || weakN >= 2) {
    executionPressureMode = "tighten";
  } else if (hasMedium || sessionsWithUncovered >= 2 || weakN >= 1) {
    executionPressureMode = "watch";
  }

  return {
    signals,
    summaryLines: summaryLines.slice(0, 2),
    executionPressureMode,
  };
}

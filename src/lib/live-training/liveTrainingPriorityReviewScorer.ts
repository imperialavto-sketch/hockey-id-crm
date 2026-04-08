/**
 * PHASE 44: rule-based оценка закрытия стартовых приоритетов по подтверждённым сигналам (без LLM).
 * Источник правды: LiveTrainingPlayerSignal после confirm.
 */

import type { LiveTrainingPlanningSnapshotDto } from "./live-training-planning-snapshot";

export type ConfirmedObservationForPriorityScore = {
  playerId: string;
  metricDomain: string;
};

export type PriorityAlignmentCoveragePlayer = {
  playerId: string;
  playerName: string;
  covered: boolean;
};

export type PriorityAlignmentCoverageDomain = {
  domain: string;
  covered: boolean;
};

export type PriorityAlignmentCoverageReinforcement = {
  domain: string;
  covered: boolean;
};

/** Сохраняется additive в continuitySnapshotJson.priorityAlignmentReview */
export type LiveTrainingPriorityAlignmentReviewDto = {
  alignmentScore: number;
  /**
   * strong | partial | weak — только при evaluationApplied === true (реальный разбор).
   * not_applicable — оценка не выполнялась (нет целей приоритета); не путать с «слабым результатом».
   */
  alignmentBand: "strong" | "partial" | "weak" | "not_applicable";
  playerCoverage: PriorityAlignmentCoveragePlayer[];
  domainCoverage: PriorityAlignmentCoverageDomain[];
  reinforcementCoverage: PriorityAlignmentCoverageReinforcement[];
  uncoveredPlayers: string[];
  uncoveredDomains: string[];
  uncoveredReinforcement: string[];
  explanation: string[];
  computedAt: string;
  /** true если не было ни одной цели startPriorities (или lowData) — числовой разбор не ведётся */
  skippedNoTargets: boolean;
  /**
   * Явный флаг: false = alignmentScore не отражает качество тренировки (удерживаем score=1 только для совместимости со старыми клиентами).
   * Старые JSON без поля: клиент выводит evaluationApplied = !skippedNoTargets.
   */
  evaluationApplied: boolean;
};

function normId(s: string): string {
  return s.trim();
}

/**
 * Те же операционные цели, что и в observation context (PHASE 43).
 */
export function extractStartPriorityTargetsFromPlanningSnapshot(
  planningSnapshot: LiveTrainingPlanningSnapshotDto | null | undefined
): {
  players: Array<{ playerId: string; playerName: string }>;
  domains: string[];
  reinforcementDomains: string[];
} {
  if (!planningSnapshot?.startPriorities || planningSnapshot.startPriorities.lowData) {
    return { players: [], domains: [], reinforcementDomains: [] };
  }
  const sp = planningSnapshot.startPriorities;
  const reinforceAreas = Array.isArray(planningSnapshot.reinforceAreas)
    ? planningSnapshot.reinforceAreas
    : [];
  const primaryDomains = Array.isArray(sp.primaryDomains) ? sp.primaryDomains : [];
  const reinforcementItems = Array.isArray(sp.reinforcementItems) ? sp.reinforcementItems : [];
  const primaryPlayersList = Array.isArray(sp.primaryPlayers) ? sp.primaryPlayers : [];
  const players = primaryPlayersList
    .map((p) => ({
      playerId: normId(p.playerId),
      playerName: typeof p.playerName === "string" ? p.playerName.trim() || "Игрок" : "Игрок",
    }))
    .filter((p) => p.playerId.length > 0);
  const uniqPlayers = new Map<string, { playerId: string; playerName: string }>();
  for (const p of players) {
    if (!uniqPlayers.has(p.playerId)) uniqPlayers.set(p.playerId, p);
  }

  const domains = [...new Set(primaryDomains.map((d) => normId(d.domain)).filter(Boolean))];

  /** Без reinforcementItems в плане не создаём целей закрепления — вес 0.2 не раздувается. */
  const reinforcementDomains =
    reinforcementItems.length > 0
      ? [...new Set(reinforceAreas.map((r) => normId(r.domain)).filter(Boolean))]
      : [];

  return {
    players: [...uniqPlayers.values()],
    domains,
    reinforcementDomains,
  };
}

function bandForScore(score: number): "strong" | "partial" | "weak" {
  if (score >= 0.8) return "strong";
  if (score >= 0.5) return "partial";
  return "weak";
}

/**
 * Чистая функция: плановый снимок + подтверждённые сигналы сессии.
 */
export function computePriorityAlignmentScore(params: {
  planningSnapshot: LiveTrainingPlanningSnapshotDto | null | undefined;
  confirmedObservations: ConfirmedObservationForPriorityScore[];
}): LiveTrainingPriorityAlignmentReviewDto {
  const now = new Date().toISOString();
  const obs = params.confirmedObservations ?? [];
  const targets = extractStartPriorityTargetsFromPlanningSnapshot(params.planningSnapshot);

  const playerIdsWithSignal = new Set(
    obs.map((o) => normId(o.playerId)).filter((id) => id.length > 0)
  );
  const domainsWithSignal = new Set(
    obs.map((o) => normId(o.metricDomain)).filter((d) => d.length > 0)
  );

  const explanation: string[] = [];

  if (
    targets.players.length === 0 &&
    targets.domains.length === 0 &&
    targets.reinforcementDomains.length === 0
  ) {
    explanation.push(
      "Приоритеты старта для этой сессии не заданы — сравнение с планом не выполнялось."
    );
    return {
      /** Совместимость: старые клиенты могли ожидать число; не использовать как «100% успеха». */
      alignmentScore: 1,
      alignmentBand: "not_applicable",
      playerCoverage: [],
      domainCoverage: [],
      reinforcementCoverage: [],
      uncoveredPlayers: [],
      uncoveredDomains: [],
      uncoveredReinforcement: [],
      explanation,
      computedAt: now,
      skippedNoTargets: true,
      evaluationApplied: false,
    };
  }

  const playerCoverage: PriorityAlignmentCoveragePlayer[] = targets.players.map((p) => {
    const covered = playerIdsWithSignal.has(p.playerId);
    return { playerId: p.playerId, playerName: p.playerName, covered };
  });

  const domainCoverage: PriorityAlignmentCoverageDomain[] = targets.domains.map((domain) => ({
    domain,
    covered: domainsWithSignal.has(domain),
  }));

  const reinforcementCoverage: PriorityAlignmentCoverageReinforcement[] =
    targets.reinforcementDomains.map((domain) => ({
      domain,
      covered: domainsWithSignal.has(domain),
    }));

  const uncoveredPlayers = [...playerCoverage.filter((p) => !p.covered).map((p) => p.playerId)].sort();
  const uncoveredDomains = [...domainCoverage.filter((d) => !d.covered).map((d) => d.domain)].sort();
  const uncoveredReinforcement = [
    ...reinforcementCoverage.filter((r) => !r.covered).map((r) => r.domain),
  ].sort();

  const totalP = targets.players.length;
  const totalD = targets.domains.length;
  const totalR = targets.reinforcementDomains.length;

  /** Нулевой знаменатель по оси → вклад оси 1 (ось не штрафует), без деления на 0. */
  const playersCov = totalP === 0 ? 1 : playerCoverage.filter((p) => p.covered).length / totalP;
  const domainsCov = totalD === 0 ? 1 : domainCoverage.filter((d) => d.covered).length / totalD;
  const reinfCov =
    totalR === 0 ? 1 : reinforcementCoverage.filter((r) => r.covered).length / totalR;

  const rawScore = playersCov * 0.4 + domainsCov * 0.4 + reinfCov * 0.2;
  const alignmentScore = Math.round((Number.isFinite(rawScore) ? rawScore : 0) * 100) / 100;
  const alignmentBand = bandForScore(alignmentScore);

  const cP = playerCoverage.filter((p) => p.covered).length;
  const cD = domainCoverage.filter((d) => d.covered).length;
  const cR = reinforcementCoverage.filter((r) => r.covered).length;
  const parts: string[] = [];
  if (totalP > 0) parts.push(`игроки ${cP}/${totalP}`);
  if (totalD > 0) parts.push(`темы ${cD}/${totalD}`);
  if (totalR > 0) parts.push(`закрепление ${cR}/${totalR}`);
  if (parts.length > 0) {
    explanation.push(`Приоритеты старта по сигналам: ${parts.join(", ")}.`);
  }
  const uncoveredCount =
    uncoveredPlayers.length + uncoveredDomains.length + uncoveredReinforcement.length;
  if (uncoveredCount > 0) {
    explanation.push(`Без подтверждённого сигнала по цели: ${uncoveredCount}.`);
  }

  return {
    alignmentScore,
    alignmentBand,
    playerCoverage,
    domainCoverage,
    reinforcementCoverage,
    uncoveredPlayers,
    uncoveredDomains,
    uncoveredReinforcement,
    explanation,
    computedAt: now,
    skippedNoTargets: false,
    evaluationApplied: true,
  };
}

/**
 * PHASE 45: перенос незакрытых приоритетов прошлого старта в carry-forward следующего планирования.
 * Источник: priorityAlignmentReview на continuity snapshot (после PHASE 44), только rule-based.
 */

import type { LiveTrainingContinuitySnapshotDto } from "./live-training-continuity-lock-in";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";

/** Provenance для отладки и UI; совпадает с контрактом задачи. */
export const UNRESOLVED_PRIORITY_CARRY_SOURCE =
  "unresolved_priority_carry_forward" as const;

/** Верхняя граница именно для слоя «незакрытый приоритет» (внутри общих лимитов carry-forward). */
export const PRIORITY_UNRESOLVED_MAX_PLAYERS = 3;
export const PRIORITY_UNRESOLVED_MAX_DOMAINS = 3;
export const PRIORITY_UNRESOLVED_MAX_REINFORCE = 2;

const REASON_PLAYER = "Незакрытый приоритет прошлого старта: нет подтверждённого сигнала.";
const REASON_DOMAIN = "Незакрытый приоритет прошлого старта по теме.";
const REASON_REINFORCE = "Незакрытое закрепление приоритета прошлого старта.";

function norm(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

/**
 * Есть ли смысл заходить в carry-forward только из-за незакрытых приоритетов
 * (расширяет ранний выход в buildLiveTrainingCarryForward).
 */
export function hasEligiblePriorityAlignmentUnresolvedCarry(
  lockIn: LiveTrainingContinuitySnapshotDto | null | undefined
): boolean {
  const par = lockIn?.priorityAlignmentReview;
  if (!par || !par.evaluationApplied || par.skippedNoTargets) return false;
  if (par.alignmentBand === "not_applicable") return false;
  const pu = Array.isArray(par.uncoveredPlayers) ? par.uncoveredPlayers : [];
  const ud = Array.isArray(par.uncoveredDomains) ? par.uncoveredDomains : [];
  const ur = Array.isArray(par.uncoveredReinforcement) ? par.uncoveredReinforcement : [];
  return (
    pu.some((x) => norm(x).length > 0) ||
    ud.some((x) => norm(x).length > 0) ||
    ur.some((x) => norm(x).length > 0)
  );
}

/**
 * Добавляет в уже частично собранный carry-forward игроков/домены/закрепление
 * из uncovered* review, с дедупом по текущим множествам и глобальным потолкам массивов.
 */
type CarryPlayerRow = {
  playerId: string;
  playerName: string;
  reason: string;
  source: string;
};
type CarryDomainRow = { domain: string; labelRu: string; reason: string; source: string };
type CarryReinforceRow = { domain: string; labelRu: string; reason: string; source: string };

export function applyUnresolvedPriorityCarryForward(params: {
  lockInSnapshot: LiveTrainingContinuitySnapshotDto | null | undefined;
  focusPlayers: CarryPlayerRow[];
  focusDomains: CarryDomainRow[];
  reinforceAreas: CarryReinforceRow[];
  seenPlayer: Set<string>;
  domainKeys: Set<string>;
  nameById: Map<string, string>;
  globalMaxPlayers: number;
  globalMaxDomains: number;
  globalMaxReinforce: number;
}): { addedSummaryHint: string | null } {
  const {
    lockInSnapshot,
    focusPlayers,
    focusDomains,
    reinforceAreas,
    seenPlayer,
    domainKeys,
    nameById,
    globalMaxPlayers,
    globalMaxDomains,
    globalMaxReinforce,
  } = params;

  if (!hasEligiblePriorityAlignmentUnresolvedCarry(lockInSnapshot)) {
    return { addedSummaryHint: null };
  }

  const par = lockInSnapshot!.priorityAlignmentReview!;
  const pu = Array.isArray(par.uncoveredPlayers) ? par.uncoveredPlayers : [];
  const ud = Array.isArray(par.uncoveredDomains) ? par.uncoveredDomains : [];
  const ur = Array.isArray(par.uncoveredReinforcement) ? par.uncoveredReinforcement : [];

  let nPlayers = 0;
  let nDomains = 0;
  let nReinf = 0;

  const reinforceSeen = new Set(reinforceAreas.map((r) => r.domain));

  for (const raw of pu) {
    const pid = norm(raw);
    if (!pid) continue;
    if (nPlayers >= PRIORITY_UNRESOLVED_MAX_PLAYERS) break;
    if (focusPlayers.length >= globalMaxPlayers) break;
    if (seenPlayer.has(pid)) continue;
    if (!nameById.has(pid)) continue;
    seenPlayer.add(pid);
    focusPlayers.push({
      playerId: pid,
      playerName: nameById.get(pid) ?? "Игрок",
      reason: REASON_PLAYER,
      source: UNRESOLVED_PRIORITY_CARRY_SOURCE,
    });
    nPlayers += 1;
  }

  for (const raw of ud) {
    const domain = norm(raw);
    if (!domain) continue;
    if (nDomains >= PRIORITY_UNRESOLVED_MAX_DOMAINS) break;
    if (focusDomains.length >= globalMaxDomains) break;
    if (domainKeys.has(domain)) continue;
    domainKeys.add(domain);
    focusDomains.push({
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: REASON_DOMAIN,
      source: UNRESOLVED_PRIORITY_CARRY_SOURCE,
    });
    nDomains += 1;
  }

  for (const raw of ur) {
    const domain = norm(raw);
    if (!domain) continue;
    if (nReinf >= PRIORITY_UNRESOLVED_MAX_REINFORCE) break;
    if (reinforceAreas.length >= globalMaxReinforce) break;
    if (reinforceSeen.has(domain)) continue;
    /** Тема уже в фокус-доменах — не дублируем в закрепление. */
    if (domainKeys.has(domain)) continue;
    reinforceSeen.add(domain);
    reinforceAreas.push({
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: REASON_REINFORCE,
      source: UNRESOLVED_PRIORITY_CARRY_SOURCE,
    });
    nReinf += 1;
  }

  if (nPlayers + nDomains + nReinf === 0) {
    return { addedSummaryHint: null };
  }

  const parts: string[] = [];
  if (nPlayers > 0) parts.push(`${nPlayers} игр.`);
  if (nDomains > 0) parts.push(`${nDomains} тем`);
  if (nReinf > 0) parts.push(`закрепление ×${nReinf}`);
  return {
    addedSummaryHint: `С прошлого старта переносим незакрытые приоритеты: ${parts.join(", ")}.`,
  };
}

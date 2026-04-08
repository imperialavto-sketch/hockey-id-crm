/**
 * PHASE 28: lightweight continuity read-model between confirmed sessions and the next start screen.
 * Uses open live-training ActionItems, last-session signals, and the existing planning slice (no new planner).
 */

import { prisma } from "@/lib/prisma";
import type { LiveTrainingContinuitySnapshotDto } from "./live-training-continuity-lock-in";
import {
  applyUnresolvedPriorityCarryForward,
  hasEligiblePriorityAlignmentUnresolvedCarry,
  UNRESOLVED_PRIORITY_CARRY_SOURCE,
} from "./liveTrainingPriorityCarryForward";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";

const MAX_SUMMARY = 3;
const MAX_PLAYERS = 4;
const MAX_DOMAINS = 3;
const MAX_REINFORCE = 2;

export type LiveTrainingCarryForwardPlayerSource =
  | "follow_up"
  | "recent_wrap_up"
  | "planning_focus"
  | "continuity_lock_in"
  /** PHASE 45: незакрытые цели из priorityAlignmentReview прошлой сессии */
  | "unresolved_priority_carry_forward";

export type LiveTrainingCarryForwardDomainSource =
  | "follow_up"
  | "recent_wrap_up"
  | "planning_focus"
  | "continuity_lock_in"
  | "unresolved_priority_carry_forward";

export type LiveTrainingCarryForwardReinforceSource =
  | "follow_up"
  | "planning_focus"
  | "continuity_lock_in"
  | "unresolved_priority_carry_forward";

export type LiveTrainingCarryForwardDto = {
  teamId: string;
  carryForwardSummary: string[];
  focusPlayers: Array<{
    playerId: string;
    playerName: string;
    reason: string;
    source: LiveTrainingCarryForwardPlayerSource;
  }>;
  focusDomains: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    source: LiveTrainingCarryForwardDomainSource;
  }>;
  reinforceAreas: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    source: LiveTrainingCarryForwardReinforceSource;
  }>;
  lowData: boolean;
};

type ActionRowSlice = {
  title: string;
  description: string;
  liveTrainingCandidateId: string;
  playerId: string | null;
  createdAt: Date;
};

type PlanningPlayerSlice = {
  playerId: string;
  playerName: string;
  reasons: string[];
};

type PlanningDomainSlice = {
  domain: string;
  labelRu: string;
  reason: string;
};

type PlanningReinforceSlice = {
  domain: string;
  labelRu: string;
  reason: string;
};

function extractDomainsFromActionDescription(description: string): string[] {
  const m = description.match(/Темы \(домены\):\s*([^\n]+)/);
  if (!m?.[1]) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function reinforceActionDomains(actionRowsScoped: ActionRowSlice[]): Set<string> {
  const set = new Set<string>();
  for (const row of actionRowsScoped) {
    const cid = row.liveTrainingCandidateId;
    if (!cid.includes("reinforce")) continue;
    for (const d of extractDomainsFromActionDescription(row.description)) {
      if (d) set.add(d);
    }
  }
  return set;
}

function firstReinforceReasonForDomain(
  actionRowsScoped: ActionRowSlice[],
  domain: string
): string | null {
  for (const row of actionRowsScoped) {
    const cid = row.liveTrainingCandidateId;
    if (!cid.includes("reinforce")) continue;
    const doms = extractDomainsFromActionDescription(row.description);
    if (!doms.includes(domain)) continue;
    const t = row.title.trim();
    if (t.length > 0) return `Задача на закрепление: ${t.slice(0, 72)}`;
  }
  return null;
}

export async function fetchLastConfirmedSessionTopDomains(
  teamId: string,
  coachId: string,
  limit: number
): Promise<Array<{ domain: string; count: number }>> {
  const session = await prisma.liveTrainingSession.findFirst({
    where: { teamId, coachId, status: "confirmed" },
    orderBy: { confirmedAt: "desc" },
    select: { id: true },
  });
  if (!session) return [];
  const grouped = await prisma.liveTrainingPlayerSignal.groupBy({
    by: ["metricDomain"],
    where: { liveTrainingSessionId: session.id },
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({ domain: g.metricDomain, count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function buildLiveTrainingCarryForward(params: {
  teamId: string;
  coachId: string;
  actionRowsScoped: ActionRowSlice[];
  nameById: Map<string, string>;
  domainAgg: Map<string, { score: number; reasons: string[]; priority: "high" | "medium" | "low" }>;
  planning: {
    focusPlayers: PlanningPlayerSlice[];
    focusDomains: PlanningDomainSlice[];
    reinforceAreas: PlanningReinforceSlice[];
  };
  /** PHASE 40: явный lock-in последней confirm — приоритетнее raw groupBy по сигналам */
  lockInSnapshot?: LiveTrainingContinuitySnapshotDto | null;
}): Promise<LiveTrainingCarryForwardDto | null> {
  const { teamId, coachId, actionRowsScoped, nameById, domainAgg, planning, lockInSnapshot } = params;
  const lockIn = lockInSnapshot ?? null;
  const hasLockInBody = Boolean(
    lockIn &&
      (lockIn.carriedFocusPlayers.length > 0 ||
        lockIn.carriedDomains.length > 0 ||
        lockIn.carriedReinforceAreas.length > 0 ||
        lockIn.summaryLines.length > 0)
  );
  const hasPriorityUnresolvedCarry = hasEligiblePriorityAlignmentUnresolvedCarry(lockIn);
  const useLockInDomains = Boolean(lockIn && lockIn.carriedDomains.length > 0);

  const hasOpenFollowUps = actionRowsScoped.length > 0;
  const reinforceFromAction = reinforceActionDomains(actionRowsScoped);
  const lastSessionTop = useLockInDomains
    ? []
    : await fetchLastConfirmedSessionTopDomains(teamId, coachId, MAX_DOMAINS);

  const hasLastSessionSignal = lastSessionTop.length > 0 || useLockInDomains;
  const hasActionReinforce = reinforceFromAction.size > 0;

  if (
    !hasOpenFollowUps &&
    !hasLastSessionSignal &&
    !hasActionReinforce &&
    !hasLockInBody &&
    !hasPriorityUnresolvedCarry
  ) {
    return null;
  }

  const focusPlayers: LiveTrainingCarryForwardDto["focusPlayers"] = [];
  const seenPlayer = new Set<string>();

  for (const row of actionRowsScoped) {
    const pid = row.playerId;
    if (!pid || seenPlayer.has(pid)) continue;
    if (focusPlayers.length >= MAX_PLAYERS) break;
    seenPlayer.add(pid);
    const title = row.title.trim();
    focusPlayers.push({
      playerId: pid,
      playerName: nameById.get(pid) ?? "Игрок",
      reason: title.length > 0 ? title : "Follow-up из live training",
      source: "follow_up",
    });
  }

  if (lockIn) {
    for (const p of lockIn.carriedFocusPlayers) {
      if (focusPlayers.length >= MAX_PLAYERS) break;
      const pid = p.playerId?.trim();
      if (!pid || seenPlayer.has(pid) || !nameById.has(pid)) continue;
      seenPlayer.add(pid);
      focusPlayers.push({
        playerId: pid,
        playerName: nameById.get(pid) ?? p.playerName,
        reason: p.reason,
        source: "continuity_lock_in",
      });
    }
  }

  const hasAnchor =
    focusPlayers.length > 0 ||
    [...domainAgg.values()].some((v) => v.reasons.some((r) => r.startsWith("Follow-up:"))) ||
    hasLastSessionSignal ||
    hasLockInBody;

  const followUpDomainEntries = [...domainAgg.entries()].filter(([, pack]) =>
    pack.reasons.some((r) => r.startsWith("Follow-up:"))
  );
  followUpDomainEntries.sort((a, b) => b[1].score - a[1].score);

  const focusDomains: LiveTrainingCarryForwardDto["focusDomains"] = [];
  const domainKeys = new Set<string>();

  for (const [domain, pack] of followUpDomainEntries) {
    if (focusDomains.length >= MAX_DOMAINS) break;
    const followLine = pack.reasons.find((r) => r.startsWith("Follow-up:")) ?? pack.reasons[0] ?? "";
    focusDomains.push({
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: followLine.replace(/^Follow-up:\s*/, "").trim() || "Follow-up из live training",
      source: "follow_up",
    });
    domainKeys.add(domain);
  }

  if (lockIn) {
    for (const d of lockIn.carriedDomains) {
      if (focusDomains.length >= MAX_DOMAINS) break;
      if (domainKeys.has(d.domain)) continue;
      domainKeys.add(d.domain);
      focusDomains.push({
        domain: d.domain,
        labelRu: d.labelRu,
        reason: d.reason,
        source: "continuity_lock_in",
      });
    }
  }

  const lastSessionDomainSet = useLockInDomains
    ? new Set(lockIn!.carriedDomains.map((x) => x.domain))
    : new Set(lastSessionTop.map((x) => x.domain));
  for (const { domain, count } of lastSessionTop) {
    if (focusDomains.length >= MAX_DOMAINS) break;
    if (domainKeys.has(domain)) continue;
    domainKeys.add(domain);
    focusDomains.push({
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: `Чаще встречалось в сигналах последней подтверждённой тренировки (${count}).`,
      source: "recent_wrap_up",
    });
  }

  if (hasAnchor) {
    for (const p of planning.focusPlayers) {
      if (focusPlayers.length >= MAX_PLAYERS) break;
      if (seenPlayer.has(p.playerId)) continue;
      seenPlayer.add(p.playerId);
      const reason = p.reasons[0]?.trim() || "В общем фокусе планирования";
      focusPlayers.push({
        playerId: p.playerId,
        playerName: p.playerName,
        reason,
        source: "planning_focus",
      });
    }

    for (const d of planning.focusDomains) {
      if (focusDomains.length >= MAX_DOMAINS) break;
      if (domainKeys.has(d.domain)) continue;
      domainKeys.add(d.domain);
      focusDomains.push({
        domain: d.domain,
        labelRu: d.labelRu,
        reason: d.reason,
        source: "planning_focus",
      });
    }
  }

  for (const d of focusDomains) {
    if (d.source === "follow_up" && lastSessionDomainSet.has(d.domain)) {
      d.reason = `${d.reason} (пересекается с сигналами последней тренировки)`;
    }
  }

  const reinforceAreas: LiveTrainingCarryForwardDto["reinforceAreas"] = [];
  if (lockIn) {
    for (const r of lockIn.carriedReinforceAreas) {
      if (reinforceAreas.length >= MAX_REINFORCE) break;
      if (reinforceAreas.some((x) => x.domain === r.domain)) continue;
      reinforceAreas.push({
        domain: r.domain,
        labelRu: r.labelRu,
        reason: r.reason,
        source: "continuity_lock_in",
      });
    }
  }
  for (const r of planning.reinforceAreas) {
    if (reinforceAreas.length >= MAX_REINFORCE) break;
    if (!reinforceFromAction.has(r.domain)) continue;
    const fromAction = firstReinforceReasonForDomain(actionRowsScoped, r.domain);
    reinforceAreas.push({
      domain: r.domain,
      labelRu: r.labelRu,
      reason: fromAction ?? r.reason,
      source: "follow_up",
    });
  }
  for (const domain of reinforceFromAction) {
    if (reinforceAreas.length >= MAX_REINFORCE) break;
    if (reinforceAreas.some((r) => r.domain === domain)) continue;
    const reason = firstReinforceReasonForDomain(actionRowsScoped, domain);
    reinforceAreas.push({
      domain,
      labelRu: liveTrainingMetricDomainLabelRu(domain),
      reason: reason ?? "Задача на закрепление из live training",
      source: "follow_up",
    });
  }

  const { addedSummaryHint } = applyUnresolvedPriorityCarryForward({
    lockInSnapshot: lockIn,
    focusPlayers,
    focusDomains,
    reinforceAreas,
    seenPlayer,
    domainKeys,
    nameById,
    globalMaxPlayers: MAX_PLAYERS,
    globalMaxDomains: MAX_DOMAINS,
    globalMaxReinforce: MAX_REINFORCE,
  });

  const carryForwardSummary: string[] = [];
  if (lockIn?.summaryLines.length) {
    carryForwardSummary.push(...lockIn.summaryLines.slice(0, 2));
  }
  if (addedSummaryHint) {
    carryForwardSummary.push(addedSummaryHint);
  }

  if (focusPlayers.filter((p) => p.source === "follow_up").length > 0) {
    const names = focusPlayers
      .filter((p) => p.source === "follow_up")
      .slice(0, 3)
      .map((p) => p.playerName.split(/\s+/)[0] || p.playerName)
      .join(", ");
    carryForwardSummary.push(`Открытые follow-up по: ${names}.`);
  }

  const fuDomLabels = focusDomains.filter((d) => d.source === "follow_up").map((d) => d.labelRu);
  if (fuDomLabels.length > 0) {
    carryForwardSummary.push(`С прошлого занятия переносим фокус на ${fuDomLabels.join(", ")}.`);
  }

  const wrapLabels = focusDomains.filter((d) => d.source === "recent_wrap_up").map((d) => d.labelRu);
  if (wrapLabels.length > 0) {
    carryForwardSummary.push(`С последней тренировки в данных чаще встречалось: ${wrapLabels.join(", ")}.`);
  }

  if (reinforceAreas.length > 0) {
    carryForwardSummary.push(`Закрепляем: ${reinforceAreas.map((r) => r.labelRu).join(", ")}.`);
  }

  const trimmedSummary = carryForwardSummary.slice(0, MAX_SUMMARY);

  const hasBody =
    trimmedSummary.length > 0 ||
    focusPlayers.length > 0 ||
    focusDomains.length > 0 ||
    reinforceAreas.length > 0;

  if (!hasBody) {
    return null;
  }

  const hasUnresolvedPriorityMaterial =
    focusPlayers.some((p) => p.source === UNRESOLVED_PRIORITY_CARRY_SOURCE) ||
    focusDomains.some((d) => d.source === UNRESOLVED_PRIORITY_CARRY_SOURCE) ||
    reinforceAreas.some((r) => r.source === UNRESOLVED_PRIORITY_CARRY_SOURCE);

  const lowData =
    !hasOpenFollowUps &&
    reinforceAreas.filter((r) => r.source === "follow_up").length === 0 &&
    focusPlayers.filter((p) => p.source === "follow_up").length === 0 &&
    focusDomains.filter((d) => d.source === "follow_up").length === 0 &&
    !(
      lockIn &&
      (lockIn.carriedFocusPlayers.length > 0 ||
        lockIn.carriedDomains.length > 0 ||
        lockIn.carriedReinforceAreas.length > 0)
    ) &&
    !hasUnresolvedPriorityMaterial;

  return {
    teamId,
    carryForwardSummary: trimmedSummary,
    focusPlayers,
    focusDomains,
    reinforceAreas,
    lowData,
  };
}

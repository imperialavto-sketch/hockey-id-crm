/**
 * PHASE 41: лёгкая приоритизация старта (follow-up > lock-in > wrap/planning), без нового planner.
 * PHASE 46: порядок tier и лимиты planning_focus/recent_wrap_up от adaptive (качество закрытия прошлого старта).
 */

import type { LiveTrainingCarryForwardDto } from "./live-training-carry-forward";
import type {
  LiveTrainingAdaptivePlanningSignals,
} from "./liveTrainingAdaptivePlanning";
import {
  ADAPTIVE_DOMAIN_TIER_BOOSTED,
  ADAPTIVE_DOMAIN_TIER_STABLE,
  ADAPTIVE_PLAYER_TIER_BOOSTED,
  ADAPTIVE_PLAYER_TIER_STABLE,
  computeLiveTrainingAdaptivePlanningSignals,
} from "./liveTrainingAdaptivePlanning";
import type {
  NextTrainingPlanningDomainFocus,
  NextTrainingPlanningPlayerFocus,
  NextTrainingPlanningReinforce,
} from "./next-training-planning-focus";

export type NextTrainingStartPrioritySource =
  | "continuity_lock_in"
  | "follow_up"
  | "planning_focus"
  | "recent_wrap_up"
  | "unresolved_priority_carry_forward";

export type NextTrainingStartPrimaryPlayer = {
  playerId: string;
  playerName: string;
  reason: string;
  source: NextTrainingStartPrioritySource;
};

export type NextTrainingStartPrimaryDomain = {
  domain: string;
  labelRu: string;
  reason: string;
  source: NextTrainingStartPrioritySource;
};

export type NextTrainingStartPrioritiesDto = {
  primaryPlayers: NextTrainingStartPrimaryPlayer[];
  primaryDomains: NextTrainingStartPrimaryDomain[];
  secondaryItems: string[];
  reinforcementItems: string[];
  summaryLine?: string;
  /** Скрывать развёрнутый блок; можно показать только summaryLine */
  lowData: boolean;
};

const MAX_PRIMARY_PLAYERS = 3;
const MAX_PRIMARY_DOMAINS = 3;
const MAX_SECONDARY = 3;
const MAX_REINFORCEMENT = 2;

function takePrimaryPlayers(
  cf: LiveTrainingCarryForwardDto,
  adaptive: LiveTrainingAdaptivePlanningSignals
): NextTrainingStartPrimaryPlayer[] {
  const tierOrder =
    adaptive.unresolvedPriorityBoostAllowed && adaptive.unresolvedPriorityBoostLevel !== "none"
      ? ADAPTIVE_PLAYER_TIER_BOOSTED
      : ADAPTIVE_PLAYER_TIER_STABLE;
  const caps = adaptive.cautiousNewPriorityLimit;

  const out: NextTrainingStartPrimaryPlayer[] = [];
  const seen = new Set<string>();
  let planningFocusAdded = 0;

  for (const source of tierOrder) {
    for (const p of cf.focusPlayers) {
      if (out.length >= MAX_PRIMARY_PLAYERS) return out;
      if (p.source !== source) continue;
      if (seen.has(p.playerId)) continue;
      if (
        source === "planning_focus" &&
        caps != null &&
        planningFocusAdded >= caps.maxPlanningFocusPlayers
      ) {
        continue;
      }
      seen.add(p.playerId);
      if (source === "planning_focus") planningFocusAdded += 1;
      out.push({
        playerId: p.playerId,
        playerName: p.playerName,
        reason: p.reason,
        source,
      });
    }
  }

  return out;
}

function takePrimaryDomains(
  cf: LiveTrainingCarryForwardDto,
  adaptive: LiveTrainingAdaptivePlanningSignals
): NextTrainingStartPrimaryDomain[] {
  const tierOrder =
    adaptive.unresolvedPriorityBoostAllowed && adaptive.unresolvedPriorityBoostLevel !== "none"
      ? ADAPTIVE_DOMAIN_TIER_BOOSTED
      : ADAPTIVE_DOMAIN_TIER_STABLE;
  const caps = adaptive.cautiousNewPriorityLimit;

  const out: NextTrainingStartPrimaryDomain[] = [];
  const seen = new Set<string>();
  let planningFocusAdded = 0;
  let recentWrapAdded = 0;

  for (const source of tierOrder) {
    for (const d of cf.focusDomains) {
      if (out.length >= MAX_PRIMARY_DOMAINS) return out;
      if (d.source !== source) continue;
      if (seen.has(d.domain)) continue;
      if (
        source === "planning_focus" &&
        caps != null &&
        planningFocusAdded >= caps.maxPlanningFocusDomains
      ) {
        continue;
      }
      if (
        source === "recent_wrap_up" &&
        caps != null &&
        recentWrapAdded >= caps.maxRecentWrapDomains
      ) {
        continue;
      }
      seen.add(d.domain);
      if (source === "planning_focus") planningFocusAdded += 1;
      if (source === "recent_wrap_up") recentWrapAdded += 1;
      out.push({
        domain: d.domain,
        labelRu: d.labelRu,
        reason: d.reason,
        source,
      });
    }
  }

  return out;
}

function reinforcementFromCarryForward(cf: LiveTrainingCarryForwardDto): string[] {
  return cf.reinforceAreas.slice(0, MAX_REINFORCEMENT).map((r) => {
    const t = r.reason.trim();
    return t.length > 0 ? `${r.labelRu}: ${t.slice(0, 96)}` : r.labelRu;
  });
}

function reinforcementFromPlanning(reinforce: NextTrainingPlanningReinforce[]): string[] {
  return reinforce.slice(0, MAX_REINFORCEMENT).map((r) => {
    const t = r.reason.trim();
    return t.length > 0 ? `${r.labelRu}: ${t.slice(0, 96)}` : r.labelRu;
  });
}

function buildSecondary(
  cf: LiveTrainingCarryForwardDto,
  primaryPlayerIds: Set<string>,
  primaryDomainKeys: Set<string>,
  maxSecondary: number
): string[] {
  const lines: string[] = [];
  const cap = Math.min(MAX_SECONDARY, maxSecondary);

  const restPlayers = cf.focusPlayers.filter((p) => !primaryPlayerIds.has(p.playerId));
  for (const p of restPlayers) {
    if (lines.length >= cap) break;
    const short = p.playerName.split(/\s+/)[0] || p.playerName;
    lines.push(`${short} — ${p.reason.slice(0, 120)}`);
  }

  const restDomains = cf.focusDomains.filter((d) => !primaryDomainKeys.has(d.domain));
  for (const d of restDomains) {
    if (lines.length >= cap) break;
    lines.push(`${d.labelRu} — ${d.reason.slice(0, 120)}`);
  }

  return lines.slice(0, cap);
}

function planningOnlyPriorities(params: {
  focusPlayers: NextTrainingPlanningPlayerFocus[];
  focusDomains: NextTrainingPlanningDomainFocus[];
  reinforceAreas: NextTrainingPlanningReinforce[];
  planningLowData: boolean;
  adaptive: LiveTrainingAdaptivePlanningSignals;
}): NextTrainingStartPrioritiesDto {
  const { focusPlayers, focusDomains, reinforceAreas, planningLowData, adaptive } = params;
  const capP =
    adaptive.cautiousNewPriorityLimit != null
      ? Math.min(MAX_PRIMARY_PLAYERS, adaptive.cautiousNewPriorityLimit.maxPlanningFocusPlayers)
      : MAX_PRIMARY_PLAYERS;
  const capD =
    adaptive.cautiousNewPriorityLimit != null
      ? Math.min(MAX_PRIMARY_DOMAINS, adaptive.cautiousNewPriorityLimit.maxPlanningFocusDomains)
      : MAX_PRIMARY_DOMAINS;

  const primaryPlayers: NextTrainingStartPrimaryPlayer[] = focusPlayers
    .slice(0, capP)
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      reason: p.reasons[0]?.trim() || "В фокусе планирования по недавним данным.",
      source: "planning_focus" as const,
    }));
  const primaryDomains: NextTrainingStartPrimaryDomain[] = focusDomains
    .slice(0, capD)
    .map((d) => ({
      domain: d.domain,
      labelRu: d.labelRu,
      reason: d.reason,
      source: "planning_focus" as const,
    }));
  const reinforcementItems = reinforcementFromPlanning(reinforceAreas);
  const hasBody =
    primaryPlayers.length > 0 || primaryDomains.length > 0 || reinforcementItems.length > 0;
  const summaryLine = hasBody
    ? primaryPlayers.length > 0
      ? `Сначала: ${primaryPlayers
          .slice(0, 2)
          .map((p) => p.playerName.split(/\s+/)[0] || p.playerName)
          .join(", ")}.`
      : primaryDomains.length > 0
        ? `Ключевые темы: ${primaryDomains
            .slice(0, 2)
            .map((d) => d.labelRu)
            .join(", ")}.`
        : undefined
    : undefined;

  return {
    primaryPlayers,
    primaryDomains,
    secondaryItems: [],
    reinforcementItems,
    summaryLine,
    lowData: planningLowData || !hasBody,
  };
}

function buildSummaryLine(
  cf: LiveTrainingCarryForwardDto | null,
  primaryPlayers: NextTrainingStartPrimaryPlayer[],
  primaryDomains: NextTrainingStartPrimaryDomain[]
): string | undefined {
  const fuNames = primaryPlayers.filter((p) => p.source === "follow_up");
  if (fuNames.length > 0) {
    return `Сначала закрываем открытые шаги: ${fuNames
      .slice(0, 2)
      .map((p) => p.playerName.split(/\s+/)[0] || p.playerName)
      .join(", ")}.`;
  }
  const unresolvedP = primaryPlayers.filter((p) => p.source === "unresolved_priority_carry_forward");
  if (unresolvedP.length > 0) {
    return `Сначала добираем приоритеты прошлого старта: ${unresolvedP
      .slice(0, 2)
      .map((p) => p.playerName.split(/\s+/)[0] || p.playerName)
      .join(", ")}.`;
  }
  if (cf?.carryForwardSummary?.[0]) {
    return cf.carryForwardSummary[0];
  }
  if (primaryPlayers.length > 0) {
    return `В приоритете: ${primaryPlayers
      .slice(0, 2)
      .map((p) => p.playerName.split(/\s+/)[0] || p.playerName)
      .join(", ")}.`;
  }
  if (primaryDomains.length > 0) {
    return `Ключевые темы старта: ${primaryDomains
      .slice(0, 2)
      .map((d) => d.labelRu)
      .join(", ")}.`;
  }
  return undefined;
}

/**
 * Ранжирование поверх уже собранного carry-forward и planning (read-only).
 */
export function buildNextTrainingStartPriorities(params: {
  carryForward: LiveTrainingCarryForwardDto | null;
  planning: {
    focusPlayers: NextTrainingPlanningPlayerFocus[];
    focusDomains: NextTrainingPlanningDomainFocus[];
    reinforceAreas: NextTrainingPlanningReinforce[];
  };
  planningLowData: boolean;
  /** PHASE 46: null/undefined → stable (как прошлая сессия без сигнала). */
  adaptivePlanning?: LiveTrainingAdaptivePlanningSignals | null;
}): NextTrainingStartPrioritiesDto {
  const { carryForward, planning, planningLowData } = params;
  const adaptive =
    params.adaptivePlanning ?? computeLiveTrainingAdaptivePlanningSignals(null);

  if (!carryForward) {
    return planningOnlyPriorities({
      focusPlayers: planning.focusPlayers,
      focusDomains: planning.focusDomains,
      reinforceAreas: planning.reinforceAreas,
      planningLowData,
      adaptive,
    });
  }

  const primaryPlayers = takePrimaryPlayers(carryForward, adaptive);
  const primaryDomains = takePrimaryDomains(carryForward, adaptive);
  const primaryPlayerIds = new Set(primaryPlayers.map((p) => p.playerId));
  const primaryDomainKeys = new Set(primaryDomains.map((d) => d.domain));

  let secondaryItems = buildSecondary(
    carryForward,
    primaryPlayerIds,
    primaryDomainKeys,
    adaptive.maxSecondaryItems
  );

  for (const p of planning.focusPlayers) {
    if (secondaryItems.length >= adaptive.maxSecondaryItems) break;
    if (primaryPlayerIds.has(p.playerId)) continue;
    const line = p.reasons[0]?.trim();
    secondaryItems.push(
      line
        ? `${p.playerName.split(/\s+/)[0] || p.playerName} — ${line.slice(0, 100)}`
        : `${p.playerName} — ориентир планирования.`
    );
  }
  for (const d of planning.focusDomains) {
    if (secondaryItems.length >= adaptive.maxSecondaryItems) break;
    if (primaryDomainKeys.has(d.domain)) continue;
    secondaryItems.push(`${d.labelRu} — в фокусе планирования.`);
  }
  secondaryItems = secondaryItems.slice(0, adaptive.maxSecondaryItems);

  let reinforcementItems = reinforcementFromCarryForward(carryForward);
  if (reinforcementItems.length < MAX_REINFORCEMENT) {
    for (const r of planning.reinforceAreas) {
      if (reinforcementItems.length >= MAX_REINFORCEMENT) break;
      const line = `${r.labelRu}: ${r.reason.trim().slice(0, 96)}`;
      if (reinforcementItems.some((x) => x.startsWith(r.labelRu))) continue;
      reinforcementItems.push(line);
    }
  }

  const summaryLine = buildSummaryLine(carryForward, primaryPlayers, primaryDomains);

  const hasOpenFollowUp =
    carryForward.focusPlayers.some(
      (p) => p.source === "follow_up" || p.source === "unresolved_priority_carry_forward"
    ) ||
    carryForward.focusDomains.some(
      (d) => d.source === "follow_up" || d.source === "unresolved_priority_carry_forward"
    );

  const primaryCount = primaryPlayers.length + primaryDomains.length;
  const hasReinforcement = reinforcementItems.length > 0;

  const lowData =
    carryForward.lowData &&
    !hasOpenFollowUp &&
    primaryCount < 2 &&
    !hasReinforcement &&
    secondaryItems.length === 0;

  return {
    primaryPlayers,
    primaryDomains,
    secondaryItems,
    reinforcementItems: reinforcementItems.slice(0, MAX_REINFORCEMENT),
    summaryLine,
    lowData,
  };
}

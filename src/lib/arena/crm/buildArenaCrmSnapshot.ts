/**
 * Детерминированные CRM-агрегаты по срезам live-training / Arena (без LLM).
 *
 * Групповой срез (`ArenaGroupSnapshot`) строится по `Player.groupId` (текущая подгруппа в CRM).
 * `PlayerGroupAssignment` используется в расписании отдельно — здесь не смешивается.
 */

import type { ArenaInterpretationDomain } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import type {
  ArenaCrmDraftSlice,
  ArenaCrmSnapshot,
  ArenaGroupSnapshot,
  ArenaPlayerSnapshot,
  ArenaPlayerTrend,
  ArenaTeamSnapshot,
} from "./arenaCrmTypes";

const DOMAIN_LABEL_RU: Record<Exclude<ArenaInterpretationDomain, "unclear">, string> = {
  technical: "Техника",
  tactical: "Тактика",
  physical: "Физика",
  behavioral: "Поведение",
};

function normSentiment(s: string): string {
  return String(s ?? "").toLowerCase();
}

function isAttentionSlice(d: ArenaCrmDraftSlice): boolean {
  const cd = d.coachDecision;
  if (cd?.reviewPriority === "high") return true;
  if (cd?.repeatedConcernInSession) return true;
  const i = d.interpretation;
  if (i?.signalKind === "mistake") return true;
  if (i?.direction === "negative") return true;
  if (normSentiment(d.sentiment) === "negative") return true;
  const sd = d.signal?.signalDirection;
  if (sd && normSentiment(sd) === "negative") return true;
  return false;
}

function isPositiveSlice(d: ArenaCrmDraftSlice): boolean {
  if (isAttentionSlice(d)) return false;
  const i = d.interpretation;
  if (i?.signalKind === "success") return true;
  if (i?.signalKind === "neutral_observation" && i.direction === "positive") return true;
  if (i?.direction === "positive") return true;
  if (normSentiment(d.sentiment) === "positive") return true;
  const sd = d.signal?.signalDirection;
  if (sd && normSentiment(sd) === "positive") return true;
  return false;
}

function pickTrend(positiveCount: number, attentionCount: number): ArenaPlayerTrend {
  if (positiveCount === 0 && attentionCount === 0) return "stable";
  if (positiveCount > attentionCount * 1.25) return "up";
  if (attentionCount > positiveCount * 1.25) return "down";
  return "stable";
}

/** Срез по одному игроку (все строки уже отфильтрованы по playerId). */
export function buildArenaPlayerSnapshot(slices: ArenaCrmDraftSlice[]): ArenaPlayerSnapshot | null {
  if (slices.length === 0) return null;
  let positiveCount = 0;
  let attentionCount = 0;
  let repeatedConcerns = 0;
  for (const d of slices) {
    if (d.coachDecision?.repeatedConcernInSession) repeatedConcerns += 1;
    if (isAttentionSlice(d)) attentionCount += 1;
    else if (isPositiveSlice(d)) positiveCount += 1;
  }
  return {
    recentSignals: slices.length,
    positiveCount,
    attentionCount,
    trend: pickTrend(positiveCount, attentionCount),
    repeatedConcerns,
  };
}

function inferDomain(d: ArenaCrmDraftSlice): Exclude<ArenaInterpretationDomain, "unclear"> | null {
  const dom = d.interpretation?.domain;
  if (dom && dom !== "unclear") return dom;
  const md = d.signal?.metricDomain?.trim();
  if (!md) return null;
  const head = md.split(/[./]/u)[0]?.toLowerCase() ?? "";
  const map: Record<string, Exclude<ArenaInterpretationDomain, "unclear">> = {
    technical: "technical",
    tactical: "tactical",
    physical: "physical",
    behavioral: "behavioral",
    behavior: "behavioral",
  };
  return map[head] ?? null;
}

function isNegativeSlice(d: ArenaCrmDraftSlice): boolean {
  return isAttentionSlice(d);
}

function isStrengthSlice(d: ArenaCrmDraftSlice): boolean {
  return isPositiveSlice(d);
}

const DOMAIN_RANK_MIN = 2;

/** Команда: зоны внимания и сильные стороны по доменам (interpretation / metricDomain). */
export function buildArenaTeamSnapshot(
  slices: ArenaCrmDraftSlice[],
  totalPlayersOnRoster: number
): ArenaTeamSnapshot {
  const negByDomain = new Map<Exclude<ArenaInterpretationDomain, "unclear">, number>();
  const posByDomain = new Map<Exclude<ArenaInterpretationDomain, "unclear">, number>();

  for (const d of slices) {
    const domain = inferDomain(d);
    if (!domain) continue;
    if (isNegativeSlice(d)) {
      negByDomain.set(domain, (negByDomain.get(domain) ?? 0) + 1);
    }
    if (isStrengthSlice(d)) {
      posByDomain.set(domain, (posByDomain.get(domain) ?? 0) + 1);
    }
  }

  const attentionZones = [...negByDomain.entries()]
    .filter(([, n]) => n >= DOMAIN_RANK_MIN)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => DOMAIN_LABEL_RU[k]);

  const dominantStrengths = [...posByDomain.entries()]
    .filter(([, n]) => n >= DOMAIN_RANK_MIN)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => DOMAIN_LABEL_RU[k]);

  return {
    totalPlayers: Math.max(0, Math.floor(totalPlayersOnRoster)),
    attentionZones,
    dominantStrengths,
  };
}

/** Классификация одного игрока по его срезам (для группы). */
function classifyPlayerForGroup(slices: ArenaCrmDraftSlice[]): {
  unstable: boolean;
  attention: boolean;
  strong: boolean;
} {
  if (slices.length === 0) {
    return { unstable: false, attention: false, strong: false };
  }
  let positiveCount = 0;
  let attentionCount = 0;
  let anyRepeated = false;
  for (const d of slices) {
    if (d.coachDecision?.repeatedConcernInSession) anyRepeated = true;
    if (isAttentionSlice(d)) attentionCount += 1;
    else if (isPositiveSlice(d)) positiveCount += 1;
  }
  const mixed = positiveCount > 0 && attentionCount > 0;
  const unstable = anyRepeated || mixed;
  const attention =
    !unstable && (attentionCount >= 2 || slices.some((d) => d.coachDecision?.reviewPriority === "high"));
  const strong = !unstable && !attention && positiveCount >= 2;
  return { unstable, attention, strong };
}

export function buildArenaGroupSnapshot(
  groupPlayerIds: string[],
  allTeamSlices: ArenaCrmDraftSlice[]
): ArenaGroupSnapshot {
  const idSet = new Set(groupPlayerIds);
  const players = groupPlayerIds.length;
  let attentionPlayers = 0;
  let strongPlayers = 0;
  let unstablePlayers = 0;

  for (const pid of groupPlayerIds) {
    const own = allTeamSlices.filter((s) => s.playerId === pid);
    const c = classifyPlayerForGroup(own);
    if (c.unstable) unstablePlayers += 1;
    else if (c.attention) attentionPlayers += 1;
    else if (c.strong) strongPlayers += 1;
  }

  return {
    players,
    attentionPlayers,
    strongPlayers,
    unstablePlayers,
  };
}

export type BuildArenaCrmSnapshotInput = {
  slices: ArenaCrmDraftSlice[];
  /** Снимок игрока (если задан playerId). */
  playerId?: string;
  /** Размер состава команды для team.totalPlayers. */
  teamRosterCount?: number;
  /** Игроки подгруппы (текущий `Player.groupId` = эта группа). */
  groupPlayerIds?: string[];
};

/**
 * Собирает запрошенные части снимка из одного набора срезов команды (последние сессии).
 */
export function buildArenaCrmSnapshot(input: BuildArenaCrmSnapshotInput): ArenaCrmSnapshot {
  const { slices, playerId, teamRosterCount, groupPlayerIds } = input;
  const out: ArenaCrmSnapshot = {};

  if (playerId) {
    const ps = slices.filter((s) => s.playerId === playerId);
    const p = buildArenaPlayerSnapshot(ps);
    if (p) out.player = p;
  }

  if (teamRosterCount != null && teamRosterCount >= 0) {
    out.team = buildArenaTeamSnapshot(slices, teamRosterCount);
  }

  if (groupPlayerIds && groupPlayerIds.length > 0) {
    out.group = buildArenaGroupSnapshot(groupPlayerIds, slices);
  }

  return out;
}

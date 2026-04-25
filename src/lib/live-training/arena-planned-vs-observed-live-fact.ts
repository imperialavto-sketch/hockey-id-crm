/**
 * Minimal persisted planned-vs-observed fact for a confirmed live session.
 * Written once per confirm path after session meaning + report draft upsert (stable signals + meaning).
 * Comparison is deterministic rule-based only (no LLM).
 */

import type { Prisma } from "@prisma/client";
import { ArenaPlannedVsObservedComparisonStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionMeaning } from "./session-meaning";
import { parsePersistedSessionMeaning } from "./session-meaning";
import {
  arenaPlannedVsObservedComparisonLabelRu,
  type ArenaPlannedVsObservedComparisonStatusDto,
  type TeamPlannedVsObservedSummaryDto,
} from "./arena-planned-vs-observed-live-fact.dto";

const OBSERVED_FOCUS_MAX_LEN = 600;

function buildObservedFocusText(meaning: SessionMeaning | null): string | null {
  if (!meaning) return null;
  const focusLabels = (meaning.focus ?? []).map((f) => f.label.trim()).filter(Boolean);
  if (focusLabels.length > 0) {
    const s = focusLabels.slice(0, 5).join(" · ");
    return s.length > OBSERVED_FOCUS_MAX_LEN ? `${s.slice(0, OBSERVED_FOCUS_MAX_LEN - 1)}…` : s;
  }
  const keys = (meaning.themes ?? [])
    .slice(0, 5)
    .map((t) => t.key.trim())
    .filter(Boolean);
  if (keys.length === 0) return null;
  const s = keys.join(" · ");
  return s.length > OBSERVED_FOCUS_MAX_LEN ? `${s.slice(0, OBSERVED_FOCUS_MAX_LEN - 1)}…` : s;
}

function plannedOverlapsObservedThemes(plannedNorm: string, meaning: SessionMeaning | null): boolean {
  if (!meaning || !plannedNorm) return false;
  for (const t of meaning.themes ?? []) {
    const k = t.key.trim().toLowerCase();
    if (k && plannedNorm.includes(k)) return true;
  }
  for (const f of meaning.focus ?? []) {
    const l = f.label.trim().toLowerCase();
    if (l && plannedNorm.includes(l)) return true;
  }
  return false;
}

function computeComparisonStatus(params: {
  totalSignalCount: number;
  plannedFocusText: string | null;
  meaning: SessionMeaning | null;
  supportingSignalCount: number;
  concernSignalCount: number;
}): ArenaPlannedVsObservedComparisonStatus {
  const { totalSignalCount, plannedFocusText, meaning, supportingSignalCount, concernSignalCount } =
    params;
  if (totalSignalCount === 0) {
    return ArenaPlannedVsObservedComparisonStatus.insufficient_data;
  }
  const planned = plannedFocusText?.trim() ?? "";
  const plannedNorm = planned.toLowerCase();
  if (!plannedNorm) {
    return ArenaPlannedVsObservedComparisonStatus.mixed;
  }
  const overlap = plannedOverlapsObservedThemes(plannedNorm, meaning);
  if (!overlap) {
    return ArenaPlannedVsObservedComparisonStatus.diverged;
  }
  if (concernSignalCount > supportingSignalCount) {
    return ArenaPlannedVsObservedComparisonStatus.mixed;
  }
  return ArenaPlannedVsObservedComparisonStatus.aligned;
}

/**
 * Idempotent upsert: one fact row per `liveTrainingSessionId`.
 * Safe to call on repeat confirm; failures must not break confirm (caller catches).
 */
export async function upsertArenaPlannedVsObservedLiveFactForSession(sessionId: string): Promise<void> {
  const live = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      teamId: true,
      trainingSessionId: true,
      plannedFocusSnapshot: true,
      sessionMeaningJson: true,
      Team: { select: { schoolId: true } },
    },
  });
  if (!live) return;

  const trainingSessionId = live.trainingSessionId?.trim() || null;
  let slotFocus: string | null = null;
  if (trainingSessionId) {
    const slot = await prisma.trainingSession.findFirst({
      where: { id: trainingSessionId, teamId: live.teamId },
      select: { arenaNextTrainingFocus: true },
    });
    slotFocus = slot?.arenaNextTrainingFocus?.trim() || null;
  }

  const snap = live.plannedFocusSnapshot?.trim() || null;
  const plannedFocusText = snap || slotFocus || null;

  const meaning = parsePersistedSessionMeaning(live.sessionMeaningJson);
  const observedFocusText = buildObservedFocusText(meaning);

  const [totalSignalCount, supportingSignalCount, concernSignalCount, domainGroups] = await Promise.all([
    prisma.liveTrainingPlayerSignal.count({ where: { liveTrainingSessionId: sessionId } }),
    prisma.liveTrainingPlayerSignal.count({
      where: { liveTrainingSessionId: sessionId, signalDirection: "positive" },
    }),
    prisma.liveTrainingPlayerSignal.count({
      where: { liveTrainingSessionId: sessionId, signalDirection: "negative" },
    }),
    prisma.liveTrainingPlayerSignal.groupBy({
      by: ["metricDomain"],
      where: { liveTrainingSessionId: sessionId },
      _count: { _all: true },
    }),
  ]);

  const domainCounts: Record<string, number> = {};
  for (const row of domainGroups) {
    const k = row.metricDomain?.trim();
    if (!k) continue;
    domainCounts[k] = (domainCounts[k] ?? 0) + row._count._all;
  }
  const observedDomainsJson = domainCounts as Prisma.InputJsonValue;

  const comparisonStatus = computeComparisonStatus({
    totalSignalCount,
    plannedFocusText,
    meaning,
    supportingSignalCount,
    concernSignalCount,
  });

  await prisma.arenaPlannedVsObservedLiveFact.upsert({
    where: { liveTrainingSessionId: sessionId },
    create: {
      schoolId: live.Team.schoolId,
      teamId: live.teamId,
      trainingSessionId,
      liveTrainingSessionId: sessionId,
      plannedFocusText,
      observedFocusText,
      comparisonStatus,
      observedDomainsJson,
      supportingSignalCount,
      concernSignalCount,
    },
    update: {
      schoolId: live.Team.schoolId,
      teamId: live.teamId,
      trainingSessionId,
      plannedFocusText,
      observedFocusText,
      comparisonStatus,
      observedDomainsJson,
      supportingSignalCount,
      concernSignalCount,
    },
  });
}

export async function getArenaPlannedVsObservedLiveFactByLiveSessionId(sessionId: string) {
  return prisma.arenaPlannedVsObservedLiveFact.findUnique({
    where: { liveTrainingSessionId: sessionId },
  });
}

function prismaComparisonStatusToDto(
  s: ArenaPlannedVsObservedComparisonStatus
): ArenaPlannedVsObservedComparisonStatusDto {
  switch (s) {
    case ArenaPlannedVsObservedComparisonStatus.aligned:
      return "aligned";
    case ArenaPlannedVsObservedComparisonStatus.mixed:
      return "mixed";
    case ArenaPlannedVsObservedComparisonStatus.diverged:
      return "diverged";
    case ArenaPlannedVsObservedComparisonStatus.insufficient_data:
      return "insufficient_data";
  }
}

const PLANNED_VS_OBSERVED_LIST_INCLUDE = {
  liveTrainingSession: { select: { confirmedAt: true } },
} as const;

type ArenaPlannedVsObservedFactRowWithSession = Prisma.ArenaPlannedVsObservedLiveFactGetPayload<{
  include: typeof PLANNED_VS_OBSERVED_LIST_INCLUDE;
}>;

function mapArenaPlannedVsObservedRowToSummaryDto(row: ArenaPlannedVsObservedFactRowWithSession): TeamPlannedVsObservedSummaryDto {
  const comparisonStatus = prismaComparisonStatusToDto(row.comparisonStatus);
  return {
    liveTrainingSessionId: row.liveTrainingSessionId,
    comparisonStatus,
    comparisonLabelRu: arenaPlannedVsObservedComparisonLabelRu(comparisonStatus),
    plannedFocusText: row.plannedFocusText?.trim() || null,
    observedFocusText: row.observedFocusText?.trim() || null,
    positiveSignalCount: row.supportingSignalCount,
    negativeSignalCount: row.concernSignalCount,
    observedDomainsJson: row.observedDomainsJson,
    factCreatedAt: row.createdAt.toISOString(),
    liveConfirmedAt: row.liveTrainingSession.confirmedAt?.toISOString() ?? null,
  };
}

/**
 * Recent team facts, newest first. Small fixed `limit` only (e.g. 5).
 */
export async function listRecentArenaPlannedVsObservedLiveFactSummariesForTeam(
  teamId: string,
  limit: number
): Promise<TeamPlannedVsObservedSummaryDto[]> {
  const rows = await prisma.arenaPlannedVsObservedLiveFact.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: PLANNED_VS_OBSERVED_LIST_INCLUDE,
  });
  return rows.map(mapArenaPlannedVsObservedRowToSummaryDto);
}

/**
 * Latest persisted planned-vs-observed fact for the team (newest first).
 * Returns null if no confirmed-session fact exists yet.
 */
export async function getLatestArenaPlannedVsObservedLiveFactSummaryForTeam(
  teamId: string
): Promise<TeamPlannedVsObservedSummaryDto | null> {
  const list = await listRecentArenaPlannedVsObservedLiveFactSummariesForTeam(teamId, 1);
  return list[0] ?? null;
}

export type { TeamPlannedVsObservedSummaryDto } from "./arena-planned-vs-observed-live-fact.dto";

/**
 * Read-only загрузка срезов Arena для CRM (последние подтверждённые live-сессии команды).
 *
 * **Группы:** агрегат по подгруппам использует `Player.groupId` (текущий состав в CRM).
 * Недельные назначения — `PlayerGroupAssignment` — остаются контуром расписания, не дублируются здесь.
 */

import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  enrichLiveTrainingDraftsWithCoachDecisions,
  toLiveTrainingDraftDto,
} from "@/lib/live-training/service";
import { buildArenaCrmSnapshot, type BuildArenaCrmSnapshotInput } from "./buildArenaCrmSnapshot";
import type { ArenaCrmDraftSlice, ArenaCrmSnapshot } from "./arenaCrmTypes";

const ARENA_CRM_SESSION_LOOKBACK = 8;

export async function loadArenaCrmDraftSlicesForTeam(teamId: string): Promise<ArenaCrmDraftSlice[]> {
  const sessions = await prisma.liveTrainingSession.findMany({
    where: { teamId, status: LiveTrainingSessionStatus.confirmed },
    orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
    take: ARENA_CRM_SESSION_LOOKBACK,
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length === 0) return [];

  const signals = await prisma.liveTrainingPlayerSignal.findMany({
    where: { liveTrainingSessionId: { in: sessionIds } },
    select: {
      liveTrainingObservationDraftId: true,
      metricDomain: true,
      signalDirection: true,
    },
  });
  const signalByDraft = new Map(
    signals.map((s) => [
      s.liveTrainingObservationDraftId,
      { metricDomain: s.metricDomain, signalDirection: String(s.signalDirection) },
    ])
  );

  const draftRows = await prisma.liveTrainingObservationDraft.findMany({
    where: { sessionId: { in: sessionIds }, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const bySession = new Map<string, typeof draftRows>();
  for (const row of draftRows) {
    let arr = bySession.get(row.sessionId);
    if (!arr) {
      arr = [];
      bySession.set(row.sessionId, arr);
    }
    arr.push(row);
  }

  const slices: ArenaCrmDraftSlice[] = [];
  for (const sid of sessionIds) {
    const sessionRows = bySession.get(sid) ?? [];
    const mapped = sessionRows.map((r) => toLiveTrainingDraftDto(r));
    const enriched = enrichLiveTrainingDraftsWithCoachDecisions(mapped);
    for (const d of enriched) {
      if (!d.playerId) continue;
      const sig = signalByDraft.get(d.id);
      slices.push({
        playerId: d.playerId,
        interpretation: d.interpretation ?? null,
        coachDecision: d.coachDecision ?? null,
        sentiment: d.sentiment,
        signal: sig ?? null,
      });
    }
  }
  return slices;
}

async function teamRosterCount(teamId: string): Promise<number> {
  return prisma.player.count({ where: { teamId } });
}

/** Снимок для карточки игрока в CRM (только player). */
export async function loadArenaCrmSnapshotForCrmPlayer(playerId: string): Promise<ArenaCrmSnapshot> {
  const p = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (!p?.teamId) return {};
  const slices = await loadArenaCrmDraftSlicesForTeam(p.teamId);
  return buildArenaCrmSnapshot({ slices, playerId });
}

/** Снимок для страницы команды (только team). */
export async function loadArenaCrmSnapshotForCrmTeam(teamId: string): Promise<ArenaCrmSnapshot> {
  const [slices, roster] = await Promise.all([
    loadArenaCrmDraftSlicesForTeam(teamId),
    teamRosterCount(teamId),
  ]);
  return buildArenaCrmSnapshot({ slices, teamRosterCount: roster });
}

export type ArenaCrmGroupRowSnapshot = {
  groupId: string;
  arenaCrm: ArenaCrmSnapshot;
};

/** По каждой активной группе команды — распределение strong / attention / unstable. */
export async function loadArenaCrmSnapshotsForTeamGroups(teamId: string): Promise<ArenaCrmGroupRowSnapshot[]> {
  const [slices, groups] = await Promise.all([
    loadArenaCrmDraftSlicesForTeam(teamId),
    prisma.teamGroup.findMany({
      where: { teamId, isActive: true },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  if (groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);
  const playersInGroups = await prisma.player.findMany({
    where: { teamId, groupId: { in: groupIds } },
    select: { id: true, groupId: true },
  });
  const idsByGroup = new Map<string, string[]>();
  for (const gid of groupIds) idsByGroup.set(gid, []);
  for (const pl of playersInGroups) {
    if (!pl.groupId) continue;
    const arr = idsByGroup.get(pl.groupId);
    if (arr) arr.push(pl.id);
  }

  return groups.map((g) => ({
    groupId: g.id,
    arenaCrm: buildArenaCrmSnapshot({
      slices,
      groupPlayerIds: idsByGroup.get(g.id) ?? [],
    }),
  }));
}

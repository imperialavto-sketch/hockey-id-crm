/**
 * Read-only загрузка срезов Arena для CRM (последние подтверждённые live-сессии команды).
 *
 * **Группы:** агрегат по подгруппам использует `Player.groupId` (текущий состав в CRM).
 * Недельные назначения — `PlayerGroupAssignment` — остаются контуром расписания, не дублируются здесь.
 *
 * **Pass 9:** к снимку добавляется `supercoreOperationalFocus` по **последней** подтверждённой сессии
 * (тот же порядок, что и lookback): facts → bindings → `ArenaActionEnvelope` (audience `crm`).
 */

import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  enrichLiveTrainingDraftsWithCoachDecisions,
  toLiveTrainingDraftDto,
} from "@/lib/live-training/service";
import { loadArenaCrmSupercoreOperationalFocusLinesForLiveSession } from "./arena-crm-supercore-operational-focus";
import { buildArenaCrmSnapshot } from "./buildArenaCrmSnapshot";
import type {
  ArenaCrmDraftSlice,
  ArenaCrmSnapshot,
  ArenaCrmSupercoreOperationalFocusLine,
} from "./arenaCrmTypes";

const ARENA_CRM_SESSION_LOOKBACK = 8;

async function listRecentConfirmedLiveSessionIdsForTeam(teamId: string, take: number): Promise<string[]> {
  const sessions = await prisma.liveTrainingSession.findMany({
    where: { teamId, status: LiveTrainingSessionStatus.confirmed },
    orderBy: [{ confirmedAt: "desc" }, { updatedAt: "desc" }],
    take,
    select: { id: true },
  });
  return sessions.map((s) => s.id);
}

async function loadArenaCrmDraftSlicesForSessionIds(sessionIds: string[]): Promise<ArenaCrmDraftSlice[]> {
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

/**
 * Read-only: operational focus по **последней** подтверждённой live-сессии команды без сборки draft slices
 * (лёгкий путь для dashboard preview и подобных обзоров).
 */
export async function loadArenaCrmSupercoreOperationalFocusForTeamLatestSession(
  teamId: string
): Promise<ArenaCrmSupercoreOperationalFocusLine[]> {
  const sessionIds = await listRecentConfirmedLiveSessionIdsForTeam(teamId, 1);
  const sid = sessionIds[0] ?? null;
  return loadArenaCrmSupercoreOperationalFocusLinesForLiveSession(sid);
}

export function dedupeAndCapTeamIdsPreserveOrder(teamIds: string[], maxTeams: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of teamIds) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= maxTeams) break;
  }
  return out;
}

function normalizeArenaCrmOperationalFocusLinesToStrings(
  focusLines: ArenaCrmSupercoreOperationalFocusLine[],
  maxLinesPerTeam: number
): string[] {
  return focusLines.slice(0, maxLinesPerTeam).map((l) => {
    const title = l.title.trim();
    const body = l.body.trim();
    return body && body !== title ? `${title} — ${body}` : title;
  });
}

export type ArenaCrmOperationalFocusStringRow = {
  teamId: string;
  lines: string[];
};

/**
 * Shared bounded path для CRM overview routes: последняя подтверждённая live-сессия →
 * operational focus lines → короткие строки (без full snapshot).
 * Дедуп по teamId с сохранением порядка первого вхождения, лимит `maxTeams`.
 */
export async function loadArenaCrmOperationalFocusStringRowsForTeamIds(
  teamIdsOrdered: string[],
  options: { maxTeams: number; maxLinesPerTeam: number }
): Promise<ArenaCrmOperationalFocusStringRow[]> {
  const ids = dedupeAndCapTeamIdsPreserveOrder(teamIdsOrdered, options.maxTeams);
  const rows: ArenaCrmOperationalFocusStringRow[] = [];
  for (const teamId of ids) {
    const focusLines = await loadArenaCrmSupercoreOperationalFocusForTeamLatestSession(teamId);
    const lines = normalizeArenaCrmOperationalFocusLinesToStrings(focusLines, options.maxLinesPerTeam);
    if (lines.length === 0) continue;
    rows.push({ teamId, lines });
  }
  return rows;
}

async function loadArenaCrmDraftSlicesAndLatestSessionForTeam(teamId: string): Promise<{
  slices: ArenaCrmDraftSlice[];
  latestConfirmedLiveSessionId: string | null;
}> {
  const sessionIds = await listRecentConfirmedLiveSessionIdsForTeam(teamId, ARENA_CRM_SESSION_LOOKBACK);
  if (sessionIds.length === 0) {
    return { slices: [], latestConfirmedLiveSessionId: null };
  }
  const slices = await loadArenaCrmDraftSlicesForSessionIds(sessionIds);
  return { slices, latestConfirmedLiveSessionId: sessionIds[0] ?? null };
}

export async function loadArenaCrmDraftSlicesForTeam(teamId: string): Promise<ArenaCrmDraftSlice[]> {
  const sessionIds = await listRecentConfirmedLiveSessionIdsForTeam(teamId, ARENA_CRM_SESSION_LOOKBACK);
  return loadArenaCrmDraftSlicesForSessionIds(sessionIds);
}

function mergeSupercoreOperationalFocusIntoCrmSnapshot(
  base: ArenaCrmSnapshot,
  lines: ArenaCrmSupercoreOperationalFocusLine[]
): ArenaCrmSnapshot {
  if (lines.length === 0) return base;
  return { ...base, supercoreOperationalFocus: lines };
}

async function teamRosterCount(teamId: string): Promise<number> {
  return prisma.player.count({ where: { teamId } });
}

function buildArenaCrmTeamSnapshotFromParts(
  slices: ArenaCrmDraftSlice[],
  roster: number,
  focusLines: ArenaCrmSupercoreOperationalFocusLine[]
): ArenaCrmSnapshot {
  const base = buildArenaCrmSnapshot({ slices, teamRosterCount: roster });
  return mergeSupercoreOperationalFocusIntoCrmSnapshot(base, focusLines);
}

async function buildArenaCrmGroupRowSnapshotsFromParts(
  teamId: string,
  slices: ArenaCrmDraftSlice[],
  focusLines: ArenaCrmSupercoreOperationalFocusLine[],
  groups: { id: string }[]
): Promise<ArenaCrmGroupRowSnapshot[]> {
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
    arenaCrm: mergeSupercoreOperationalFocusIntoCrmSnapshot(
      buildArenaCrmSnapshot({
        slices,
        groupPlayerIds: idsByGroup.get(g.id) ?? [],
      }),
      focusLines
    ),
  }));
}

/**
 * Один проход draft/latest + один расчёт supercore focus для team CRM HTTP:
 * то же содержимое, что и пара `loadArenaCrmSnapshotForCrmTeam` + `loadArenaCrmSnapshotsForTeamGroups`,
 * без повторного `loadArenaCrmDraftSlicesAndLatestSessionForTeam` и без второго вызова
 * `loadArenaCrmSupercoreOperationalFocusLinesForLiveSession` для той же сессии.
 */
export async function loadArenaCrmTeamArenaSnapshotBundle(teamId: string): Promise<{
  snap: ArenaCrmSnapshot;
  groupRows: ArenaCrmGroupRowSnapshot[];
}> {
  const { slices, latestConfirmedLiveSessionId } = await loadArenaCrmDraftSlicesAndLatestSessionForTeam(teamId);
  const [roster, focusLines, groups] = await Promise.all([
    teamRosterCount(teamId),
    loadArenaCrmSupercoreOperationalFocusLinesForLiveSession(latestConfirmedLiveSessionId),
    prisma.teamGroup.findMany({
      where: { teamId, isActive: true },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  const snap = buildArenaCrmTeamSnapshotFromParts(slices, roster, focusLines);
  const groupRows = await buildArenaCrmGroupRowSnapshotsFromParts(teamId, slices, focusLines, groups);
  return { snap, groupRows };
}

/** Снимок для карточки игрока в CRM (только player). */
export async function loadArenaCrmSnapshotForCrmPlayer(playerId: string): Promise<ArenaCrmSnapshot> {
  const p = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (!p?.teamId) return {};
  const { slices, latestConfirmedLiveSessionId } = await loadArenaCrmDraftSlicesAndLatestSessionForTeam(p.teamId);
  const focusLines = await loadArenaCrmSupercoreOperationalFocusLinesForLiveSession(
    latestConfirmedLiveSessionId
  );
  const base = buildArenaCrmSnapshot({ slices, playerId });
  return mergeSupercoreOperationalFocusIntoCrmSnapshot(base, focusLines);
}

/** Снимок для страницы команды (только team). */
export async function loadArenaCrmSnapshotForCrmTeam(teamId: string): Promise<ArenaCrmSnapshot> {
  const { slices, latestConfirmedLiveSessionId } = await loadArenaCrmDraftSlicesAndLatestSessionForTeam(teamId);
  const [roster, focusLines] = await Promise.all([
    teamRosterCount(teamId),
    loadArenaCrmSupercoreOperationalFocusLinesForLiveSession(latestConfirmedLiveSessionId),
  ]);
  return buildArenaCrmTeamSnapshotFromParts(slices, roster, focusLines);
}

export type ArenaCrmGroupRowSnapshot = {
  groupId: string;
  arenaCrm: ArenaCrmSnapshot;
};

/** По каждой активной группе команды — распределение strong / attention / unstable. */
export async function loadArenaCrmSnapshotsForTeamGroups(teamId: string): Promise<ArenaCrmGroupRowSnapshot[]> {
  const { slices, latestConfirmedLiveSessionId } = await loadArenaCrmDraftSlicesAndLatestSessionForTeam(teamId);
  const [groups, focusLines] = await Promise.all([
    prisma.teamGroup.findMany({
      where: { teamId, isActive: true },
      select: { id: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    loadArenaCrmSupercoreOperationalFocusLinesForLiveSession(latestConfirmedLiveSessionId),
  ]);
  return buildArenaCrmGroupRowSnapshotsFromParts(teamId, slices, focusLines, groups);
}

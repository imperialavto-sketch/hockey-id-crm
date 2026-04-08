/**
 * Shared parent players logic — used by /api/parent/mobile/players and /api/me/players.
 * Returns players for parent's children only (parentId or ParentPlayer link).
 */

import { prisma } from "./prisma";
import { canParentAccessPlayer } from "./parent-access";

const playerListInclude = {
  team: { select: { name: true } },
  parent: { select: { firstName: true, lastName: true } },
  profile: { select: { jerseyNumber: true } },
} as const;

const playerDetailInclude = {
  team: { select: { name: true, id: true } },
  parent: { select: { firstName: true, lastName: true } },
  profile: { select: { jerseyNumber: true } },
  stats: { orderBy: { season: "desc" }, take: 1 },
} as const;

export type ParentPlayerList = Awaited<
  ReturnType<typeof getParentPlayers>
>[number];

export type ParentPlayerDetail = Awaited<
  ReturnType<typeof getParentPlayerById>
>;

/**
 * Get players for parent's children.
 * Auth must be validated by caller (PARENT role, parentId).
 */
export async function getParentPlayers(parentId: string) {
  return prisma.player.findMany({
    where: {
      OR: [
        { parentId },
        { parentPlayers: { some: { parentId } } },
      ],
    },
    include: playerListInclude,
  });
}

/**
 * Get single player by id if parent has access.
 * Returns null if player not found or access denied.
 */
export async function getParentPlayerById(
  parentId: string,
  playerId: string
) {
  const canAccess = await canParentAccessPlayer(parentId, playerId);
  if (!canAccess) return null;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: playerDetailInclude,
  });

  return player;
}

/** Последняя оценка на тренировке (по дате сессии), для родителя. */
export type ParentLatestSessionEvaluation = {
  effort?: number;
  focus?: number;
  discipline?: number;
  note?: string;
};

export async function getParentLatestSessionEvaluation(
  playerId: string
): Promise<ParentLatestSessionEvaluation | null> {
  const row = await prisma.playerSessionEvaluation.findFirst({
    where: { playerId },
    orderBy: {
      training: { startAt: "desc" },
    },
    select: {
      effort: true,
      focus: true,
      discipline: true,
      note: true,
    },
  });
  if (!row) return null;
  const out: ParentLatestSessionEvaluation = {};
  if (row.effort != null) out.effort = row.effort;
  if (row.focus != null) out.focus = row.focus;
  if (row.discipline != null) out.discipline = row.discipline;
  if (row.note?.trim()) out.note = row.note.trim();
  if (
    out.effort == null &&
    out.focus == null &&
    out.discipline == null &&
    out.note == null
  ) {
    return null;
  }
  return out;
}

/** Средние оценки за последние `days` дней (по дате начала тренировки). */
export type ParentEvaluationSummary = {
  totalEvaluations: number;
  avgEffort: number | null;
  avgFocus: number | null;
  avgDiscipline: number | null;
};

function roundAvg1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function getParentEvaluationSummary(
  playerId: string,
  days = 90
): Promise<ParentEvaluationSummary> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const rows = await prisma.playerSessionEvaluation.findMany({
    where: {
      playerId,
      training: { startAt: { gte: cutoff } },
    },
    select: {
      effort: true,
      focus: true,
      discipline: true,
    },
  });

  const scored = rows.filter(
    (r) => r.effort != null || r.focus != null || r.discipline != null
  );

  const avgField = (getter: (r: (typeof scored)[0]) => number | null) => {
    const vals = scored.map(getter).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return roundAvg1(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  return {
    totalEvaluations: scored.length,
    avgEffort: avgField((r) => r.effort),
    avgFocus: avgField((r) => r.focus),
    avgDiscipline: avgField((r) => r.discipline),
  };
}

/** Последний текстовый отчёт тренера по игроку (по дате сессии). */
export type ParentLatestSessionReport = {
  trainingId: string;
  summary?: string | null;
  focusAreas?: string | null;
  coachNote?: string | null;
  parentMessage?: string | null;
  updatedAt: string;
};

export async function getParentLatestSessionReport(
  playerId: string
): Promise<ParentLatestSessionReport | null> {
  const attendanceRows = await prisma.trainingAttendance.findMany({
    where: { playerId },
    orderBy: { training: { startAt: "desc" } },
    take: 40,
    include: {
      training: {
        include: { sessionReport: true },
      },
    },
  });

  for (const a of attendanceRows) {
    const r = a.training.sessionReport;
    if (!r) continue;
    const summary = r.summary?.trim() || null;
    const focusAreas = r.focusAreas?.trim() || null;
    const coachNote = r.coachNote?.trim() || null;
    const parentMessage = r.parentMessage?.trim() || null;
    if (!summary && !focusAreas && !coachNote && !parentMessage) continue;
    return {
      trainingId: a.trainingId,
      summary,
      focusAreas,
      coachNote,
      parentMessage,
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  const legacy = await prisma.playerSessionReport.findFirst({
    where: { playerId },
    orderBy: {
      training: { startAt: "desc" },
    },
    select: {
      trainingId: true,
      summary: true,
      focusAreas: true,
      coachNote: true,
      parentMessage: true,
      updatedAt: true,
    },
  });
  if (!legacy) return null;
  const summary = legacy.summary?.trim() || null;
  const focusAreas = legacy.focusAreas?.trim() || null;
  const coachNote = legacy.coachNote?.trim() || null;
  const parentMessage = legacy.parentMessage?.trim() || null;
  if (!summary && !focusAreas && !coachNote && !parentMessage) {
    return null;
  }
  return {
    trainingId: legacy.trainingId,
    summary,
    focusAreas,
    coachNote,
    parentMessage,
    updatedAt: legacy.updatedAt.toISOString(),
  };
}

function trainingSessionTypeLabel(type: string): string {
  switch (type) {
    case "ice":
      return "Лёд";
    case "ofp":
      return "ОФП";
    case "mixed":
      return "Смешанная";
    default:
      return type?.trim() ? type : "Тренировка";
  }
}

/** Published `TrainingSessionReport` rows for parent-facing live-training summary (newest first). */
export type ParentFacingSessionReport = {
  trainingId: string;
  teamName: string | null;
  sessionKindLabel: string;
  sessionStartedAt: string;
  summary: string | null;
  focusAreas: string | null;
  parentMessage: string | null;
};

export async function listParentFacingPublishedSessionReports(
  playerId: string,
  limit: number
): Promise<ParentFacingSessionReport[]> {
  const cap = Math.max(1, Math.min(50, limit));
  const attendanceRows = await prisma.trainingAttendance.findMany({
    where: { playerId },
    orderBy: { training: { startAt: "desc" } },
    take: cap * 12,
    include: {
      training: {
        include: {
          sessionReport: true,
          team: { select: { name: true } },
        },
      },
    },
  });

  const out: ParentFacingSessionReport[] = [];
  for (const a of attendanceRows) {
    const r = a.training.sessionReport;
    if (!r) continue;
    const summary = r.summary?.trim() || null;
    const focusAreas = r.focusAreas?.trim() || null;
    const coachNote = r.coachNote?.trim() || null;
    const parentMessage = r.parentMessage?.trim() || null;
    if (!summary && !focusAreas && !coachNote && !parentMessage) continue;

    out.push({
      trainingId: a.trainingId,
      teamName: a.training.team?.name ?? null,
      sessionKindLabel: trainingSessionTypeLabel(a.training.type),
      sessionStartedAt: a.training.startAt.toISOString(),
      summary,
      focusAreas,
      parentMessage,
    });
    if (out.length >= cap) break;
  }

  return out;
}

export interface CreateParentPlayerInput {
  firstName: string;
  lastName: string;
  birthYear: number;
  position?: string;
}

/**
 * Get player stats for parent. Returns aggregated latest stat or null.
 * Access must be validated by caller (canParentAccessPlayer).
 */
export async function getParentPlayerStats(
  parentId: string,
  playerId: string
): Promise<{ games: number; goals: number; assists: number; points: number; pim: number } | null> {
  const canAccess = await canParentAccessPlayer(parentId, playerId);
  if (!canAccess) return null;

  const stats = await prisma.playerStat.findMany({
    where: { playerId },
    orderBy: { season: "desc" },
    take: 1,
  });

  const latest = stats[0];
  if (!latest) return null;

  return {
    games: latest.games,
    goals: latest.goals,
    assists: latest.assists,
    points: latest.points,
    pim: latest.pim,
  };
}

/**
 * Create a player for the given parent.
 * parentId must come from auth only — never from body.
 */
export async function createParentPlayer(
  parentId: string,
  input: CreateParentPlayerInput
) {
  return prisma.player.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      birthYear: input.birthYear,
      position: (input.position?.trim() || "Нападающий").trim(),
      grip: "Правый",
      parentId,
    },
    include: playerListInclude,
  });
}

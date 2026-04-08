/**
 * Team groups MVP — списки, счётчики, назначение игрока в группу (Player.groupId + недельный assignment).
 */

import { prisma } from "./prisma";
import { toWeekStartUTC } from "./schedule-week";

export type TeamGroupListItem = {
  id: string;
  teamId: string;
  name: string;
  level: number;
  color: string | null;
  playersCount: number;
  createdAt: string;
};

export async function listActiveTeamGroupsWithCounts(
  teamId: string
): Promise<TeamGroupListItem[]> {
  const rows = await prisma.teamGroup.findMany({
    where: { teamId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { Player: true } } },
  });
  return rows.map((g) => ({
    id: g.id,
    teamId: g.teamId,
    name: g.name,
    level: g.level,
    color: g.color ?? null,
    playersCount: g._count.Player,
    createdAt: g.createdAt.toISOString(),
  }));
}

/** Для PATCH: парсинг color из JSON (null = сброс). */
export function parseOptionalColorField(
  body: Record<string, unknown>
): string | null | undefined {
  if (!("color" in body)) return undefined;
  const v = body.color;
  if (v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  return undefined;
}

export type AssignPlayerToGroupResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Обновляет Player.groupId; при groupId != null синхронизирует PlayerGroupAssignment на выбранную ISO-неделю (UTC).
 * `weekStartDate` — любой день недели, нормализуется через toWeekStartUTC; по умолчанию текущая неделя.
 * При groupId == null снимает группу и удаляет assignment на эту неделю (чтобы roster групповых слотов не расходился).
 */
export async function assignPlayerToTeamGroupMvp(params: {
  playerId: string;
  groupId: string | null;
  /** Якорная дата недели (как в CRM /api/groups/assign); иначе — «сейчас». */
  weekAnchorDate?: Date;
}): Promise<AssignPlayerToGroupResult> {
  const { playerId, groupId, weekAnchorDate } = params;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, teamId: true },
  });
  if (!player) {
    return { ok: false, status: 404, error: "Игрок не найден" };
  }
  if (!player.teamId) {
    return { ok: false, status: 400, error: "Игрок не привязан к команде" };
  }

  const weekStartDate = toWeekStartUTC(weekAnchorDate ?? new Date());

  if (groupId === null) {
    await prisma.$transaction([
      prisma.player.update({
        where: { id: playerId },
        data: { groupId: null },
      }),
      prisma.playerGroupAssignment.deleteMany({
        where: { playerId, weekStartDate },
      }),
    ]);
    return { ok: true };
  }

  const group = await prisma.teamGroup.findFirst({
    where: { id: groupId, teamId: player.teamId, isActive: true },
  });
  if (!group) {
    return {
      ok: false,
      status: 400,
      error: "Группа не найдена или не принадлежит команде игрока",
    };
  }

  await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { groupId },
    }),
    prisma.playerGroupAssignment.upsert({
      where: {
        playerId_weekStartDate: { playerId, weekStartDate },
      },
      create: { playerId, groupId, weekStartDate },
      update: { groupId },
    }),
  ]);

  return { ok: true };
}

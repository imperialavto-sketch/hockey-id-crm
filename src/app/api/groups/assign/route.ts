/**
 * POST /api/groups/assign — assign player to group for a week (upsert).
 * Body: { playerId, groupId, weekStartDate } (YYYY-MM-DD, normalized to Monday UTC).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessibleTeamIds, getAccessiblePlayerIds } from "@/lib/data-scope";
import { parseDateParamUTC, toWeekStartUTC } from "@/lib/schedule-week";

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const playerId = typeof body.playerId === "string" ? body.playerId.trim() : "";
  const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
  const weekRaw = typeof body.weekStartDate === "string" ? body.weekStartDate.trim() : "";

  if (!playerId || !groupId || !weekRaw) {
    return NextResponse.json(
      { error: "Обязательны: playerId, groupId, weekStartDate" },
      { status: 400 }
    );
  }

  const parsed = parseDateParamUTC(weekRaw);
  if (!parsed) {
    return NextResponse.json(
      { error: "weekStartDate: ожидается YYYY-MM-DD" },
      { status: 400 }
    );
  }
  const weekStartDate = toWeekStartUTC(parsed);

  try {
    const playerIds = await getAccessiblePlayerIds(user!, prisma);
    if (playerIds !== null && !playerIds.includes(playerId)) {
      return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { teamId: true },
    });
    if (!player?.teamId) {
      return NextResponse.json(
        { error: "Игрок не в команде" },
        { status: 400 }
      );
    }

    const teamIds = await getAccessibleTeamIds(user!, prisma);
    if (teamIds !== null && !teamIds.includes(player.teamId)) {
      return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
    }

    const group = await prisma.teamGroup.findFirst({
      where: { id: groupId, teamId: player.teamId, isActive: true },
    });
    if (!group) {
      return NextResponse.json(
        { error: "Группа не найдена или не принадлежит команде игрока" },
        { status: 400 }
      );
    }

    const assignment = await prisma.playerGroupAssignment.upsert({
      where: {
        playerId_weekStartDate: { playerId, weekStartDate },
      },
      create: {
        playerId,
        groupId,
        weekStartDate,
      },
      update: { groupId },
      include: {
        group: { select: { id: true, name: true, level: true } },
        player: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("POST /api/groups/assign failed:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения назначения" },
      { status: 500 }
    );
  }
}

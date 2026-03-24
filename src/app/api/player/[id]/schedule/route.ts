/**
 * GET /api/player/[id]/schedule
 * Schedule MVP — player's training sessions via group assignment.
 * Player sees only sessions of their assigned group for the week.
 * Auth: requireAuth + checkPlayerAccess (coach or parent).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireAuth(req);
  if (res) return res;

  const { id: playerId } = await params;
  if (!playerId) {
    return NextResponse.json(
      { error: "ID игрока обязателен" },
      { status: 400 }
    );
  }

  const dateParam = req.nextUrl.searchParams.get("date")?.trim();
  const date = dateParam
    ? new Date(dateParam + "T00:00:00.000Z")
    : new Date();
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "Неверный формат date" },
      { status: 400 }
    );
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const accessRes = checkPlayerAccess(user!, {
      ...player,
      team: player.team ?? undefined,
    });
    if (accessRes) return accessRes;

    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const assignment = await prisma.playerGroupAssignment.findUnique({
      where: {
        playerId_weekStartDate: {
          playerId,
          weekStartDate: weekStart,
        },
      },
      include: { group: true },
    });

    if (!assignment) {
      return NextResponse.json({
        playerId,
        weekStartDate: weekStart.toISOString().slice(0, 10),
        group: null,
        sessions: [],
      });
    }

    const sessions = await prisma.trainingSession.findMany({
      where: {
        groupId: assignment.groupId,
        status: { not: "cancelled" },
        startAt: { gte: weekStart, lt: weekEnd },
      },
      include: {
        group: { select: { id: true, name: true, level: true } },
        coach: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startAt: "asc" },
    });

    const items = sessions.map((s) => ({
      id: s.id,
      teamId: s.teamId,
      groupId: s.groupId,
      group: s.group,
      coachId: s.coachId,
      coach: s.coach,
      type: s.type,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      locationName: s.locationName,
      locationAddress: s.locationAddress,
      notes: s.notes,
      status: s.status,
      sessionStatus: s.sessionStatus,
    }));

    return NextResponse.json({
      playerId,
      weekStartDate: weekStart.toISOString().slice(0, 10),
      group: {
        id: assignment.group.id,
        name: assignment.group.name,
        level: assignment.group.level,
      },
      sessions: items,
    });
  } catch (error) {
    console.error("GET /api/player/[id]/schedule failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки расписания",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

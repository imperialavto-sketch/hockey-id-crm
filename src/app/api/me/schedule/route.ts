/**
 * GET /api/me/schedule — parent-app schedule.
 * Query: playerId (optional), weekStartDate (optional, YYYY-MM-DD Monday).
 * Uses weekly group assignment → TrainingSession; else legacy Training for player's team.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import {
  getParentScheduleForPlayer,
  getParentScheduleTrainings,
} from "@/lib/parent-schedule";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const playerIdParam = req.nextUrl.searchParams.get("playerId")?.trim();
  const weekStartDateRaw = req.nextUrl.searchParams.get("weekStartDate")?.trim();
  const weekStartDate = weekStartDateRaw || undefined;

  try {
    let playerId: string | undefined = playerIdParam;

    if (!playerId) {
      const first = await prisma.player.findFirst({
        where: {
          OR: [
            { parentId: user.parentId },
            { parentPlayers: { some: { parentId: user.parentId } } },
          ],
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      playerId = first?.id;
    }

    const trainings = playerId
      ? await getParentScheduleForPlayer(user.parentId, playerId, weekStartDate)
      : await getParentScheduleTrainings(user.parentId);

    const items = trainings.map((t) => ({
      id: t.id,
      title: t.title,
      startTime: t.startTime.toISOString(),
      endTime: t.endTime.toISOString(),
      location: t.location,
      teamId: t.teamId,
      sessionType: t.sessionType,
      sessionSubType: t.sessionSubType,
      attendanceStatus: t.attendanceStatus,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/me/schedule failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки расписания" },
      { status: 500 }
    );
  }
}

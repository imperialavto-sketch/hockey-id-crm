/**
 * Parent Mobile API — weekly schedule.
 * Requires teamId query param, or returns empty when no team.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";

const DAY_NAMES = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function getDayName(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  const { searchParams } = new URL(req.url);
  let teamId = searchParams.get("teamId");

  if (!teamId && user?.role === "PARENT" && user?.parentId) {
    const player = await prisma.player.findFirst({
      where: {
        OR: [
          { parentId: user.parentId },
          { parentPlayers: { some: { parentId: user.parentId } } },
        ],
      },
      select: { teamId: true },
    });
    teamId = player?.teamId ?? null;
  }

  if (!teamId) {
    if (user?.role !== "PARENT" || !user?.parentId) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }
    return NextResponse.json([]);
  }

  try {
    const trainings = await prisma.training.findMany({
      where: { teamId },
      orderBy: { startTime: "asc" },
    });

    const byDay = new Map<number, { id: string; title: string; time: string }[]>();
    for (let i = 0; i < 7; i++) byDay.set(i, []);

    trainings.forEach((t) => {
      const d = new Date(t.startTime);
      const dayNum = d.getDay();
      byDay.get(dayNum)!.push({
        id: t.id,
        title: t.title,
        time: formatTime(d),
      });
    });

    const result: { id: string; day: string; title: string; time: string }[] = [];
    for (let i = 1; i <= 6; i++) {
      const dayName = DAY_NAMES[i];
      const items = byDay.get(i) ?? [];
      if (items.length > 0) {
        items.forEach((it) =>
          result.push({ id: it.id, day: dayName, title: it.title, time: it.time })
        );
      } else {
        result.push({
          id: `rest-${i}`,
          day: dayName,
          title: "Выходной",
          time: "—",
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/parent/mobile/schedule failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки расписания" },
      { status: 500 }
    );
  }
}

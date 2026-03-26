/**
 * Parent Mobile API — weekly schedule.
 * Auth: Bearer required.
 * Query: playerId (optional), weekStartDate (optional) — группа ребёнка на неделю → TrainingSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getParentScheduleForPlayer,
  getParentScheduleTrainings,
} from "@/lib/parent-schedule";

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

function attendanceLabel(t: {
  sessionType?: string;
  attendanceStatus?: "present" | "absent" | null;
}): string | undefined {
  if (!t.sessionType) return undefined;
  if (t.attendanceStatus === "present") return "Был";
  if (t.attendanceStatus === "absent") return "Не был";
  return "Не отмечено";
}

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    const playerIdParam = req.nextUrl.searchParams.get("playerId")?.trim();
    const weekStartDateRaw = req.nextUrl.searchParams.get("weekStartDate")?.trim();
    const weekStartDate = weekStartDateRaw || undefined;

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

    const byDay = new Map<
      number,
      { id: string; title: string; time: string; attendance?: string }[]
    >();
    for (let i = 0; i < 7; i++) byDay.set(i, []);

    trainings.forEach((t) => {
      const d = new Date(t.startTime);
      const dayNum = d.getDay();
      const att = attendanceLabel(t);
      byDay.get(dayNum)!.push({
        id: t.id,
        title: t.title,
        time: formatTime(d),
        ...(att !== undefined ? { attendance: att } : {}),
      });
    });

    const result: {
      id: string;
      day: string;
      title: string;
      time: string;
      attendance?: string;
    }[] = [];
    for (let i = 1; i <= 6; i++) {
      const dayName = DAY_NAMES[i];
      const items = byDay.get(i) ?? [];
      if (items.length > 0) {
        items.forEach((it) =>
          result.push({
            id: it.id,
            day: dayName,
            title: it.title,
            time: it.time,
            ...(it.attendance !== undefined ? { attendance: it.attendance } : {}),
          })
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

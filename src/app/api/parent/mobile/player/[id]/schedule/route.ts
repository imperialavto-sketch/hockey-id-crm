/**
 * Parent Mobile API — player schedule (trainings).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const user = await getAuthFromRequest(req);

  const player = await prisma.player.findUnique({
    where: { id },
    include: { team: true },
  });

  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  if (user?.role !== "PARENT" || !user?.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }
  const canAccess = await canParentAccessPlayer(user.parentId, player.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  if (!player.teamId) {
    return NextResponse.json([]);
  }

  const trainings = await prisma.training.findMany({
    where: { teamId: player.teamId },
    orderBy: { startTime: "asc" },
  });

  const mapped = trainings.map((t, i) => ({
    id: t.id,
    day: getDayName(new Date(t.startTime)),
    title: t.title,
    time: formatTime(new Date(t.startTime)),
  }));

  return NextResponse.json(mapped);
}

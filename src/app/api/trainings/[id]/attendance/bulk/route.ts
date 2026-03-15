import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTraining } from "@/lib/data-scope";

const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

/** POST body: { status: "PRESENT" | "ABSENT" | ..., playerIds?: string[] } */
export async function POST(req: NextRequest) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  try {
    const url = new URL(req.url);
    const trainingId = url.pathname.split("/")[3];
    if (!trainingId) {
      return NextResponse.json({ error: "ID тренировки обязателен" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { status, playerIds } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Недопустимый статус посещаемости" },
        { status: 400 }
      );
    }

    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { team: true },
    });
    if (!training) {
      return NextResponse.json({ error: "Тренировка не найдена" }, { status: 404 });
    }
    if (!canAccessTraining(user!, { ...training, team: training.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }

    const ids = Array.isArray(playerIds) ? playerIds.filter((x: unknown) => typeof x === "string") : [];
    if (ids.length === 0) {
      const players = await prisma.player.findMany({
        where: { teamId: training.teamId },
        select: { id: true },
      });
      ids.push(...players.map((p) => p.id));
    }

    const statusVal = status as (typeof VALID_STATUSES)[number];
    const results = await Promise.all(
      ids.map(async (playerId: string) => {
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player || player.teamId !== training.teamId) return null;
        return prisma.attendance.upsert({
          where: {
            trainingId_playerId: { trainingId, playerId },
          },
          create: {
            trainingId,
            playerId,
            status: statusVal,
          },
          update: { status: statusVal },
        });
      })
    );

    return NextResponse.json({ updated: results.filter(Boolean).length });
  } catch (error) {
    console.error("POST /api/trainings/[id]/attendance/bulk failed:", error);
    return NextResponse.json(
      { error: "Ошибка массовой отметки посещаемости" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTraining } from "@/lib/data-scope";

const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

export async function POST(req: NextRequest) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  try {
    const url = new URL(req.url);
    const trainingId = url.pathname.split("/")[3];
    if (!trainingId) {
      return NextResponse.json(
        { error: "ID тренировки обязателен" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { playerId, status, comment } = body;

    if (!playerId || !status) {
      return NextResponse.json(
        { error: "Игрок и статус обязательны" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
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
      return NextResponse.json(
        { error: "Тренировка не найдена" },
        { status: 404 }
      );
    }
    if (!canAccessTraining(user!, { ...training, team: training.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });
    if (!player) {
      return NextResponse.json(
        { error: "Игрок не найден" },
        { status: 404 }
      );
    }

    if (player.teamId !== training.teamId) {
      return NextResponse.json(
        { error: "Игрок не входит в состав команды этой тренировки" },
        { status: 400 }
      );
    }

    const updateData: { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; comment?: string } = {
      status: status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
    };
    if (comment !== undefined) updateData.comment = comment || null;

    const attendance = await prisma.attendance.upsert({
      where: {
        trainingId_playerId: { trainingId, playerId: String(playerId) },
      },
      create: {
        trainingId,
        playerId: String(playerId),
        status: status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
        comment: comment || null,
      },
      update: updateData,
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("POST /api/trainings/[id]/attendance failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка сохранения посещаемости",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

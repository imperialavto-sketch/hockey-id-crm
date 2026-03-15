import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const { lastCheckup, injuries, restrictions } = body;

    const lastCheckupDate =
      lastCheckup != null && lastCheckup !== ""
        ? new Date(lastCheckup)
        : null;
    if (lastCheckupDate != null && isNaN(lastCheckupDate.getTime())) {
      return NextResponse.json(
        { error: "Некорректная дата осмотра" },
        { status: 400 }
      );
    }

    const injuriesData = (Array.isArray(injuries) ? injuries : injuries != null ? [] : []) as Prisma.InputJsonValue;

    const medical = await prisma.medical.upsert({
      where: { playerId: id },
      create: {
        playerId: id,
        lastCheckup: lastCheckupDate,
        injuries: injuriesData,
        restrictions: restrictions ? String(restrictions).trim() : null,
      },
      update: {
        lastCheckup: lastCheckupDate,
        injuries: injuriesData,
        restrictions: restrictions ? String(restrictions).trim() : null,
      },
    });

    return NextResponse.json(medical);
  } catch (error) {
    console.error("POST /api/player/[id]/medical failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка сохранения медицинской карты",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

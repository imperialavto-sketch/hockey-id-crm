import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { calculatePlayerDevelopment } from "@/lib/player-ai";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: { include: { coach: true } },
        skills: true,
        coachRatings: { include: { coach: true } },
        attendances: { select: { status: true } },
        stats: true,
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const accessRes = checkPlayerAccess(user!, {
      ...player,
      team: player.team ?? undefined,
    });
    if (accessRes) return accessRes;

    const result = calculatePlayerDevelopment({
      skills: player.skills ?? undefined,
      coachRatings: player.coachRatings,
      attendances: player.attendances,
      stats: player.stats,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/player/[id]/ai failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка расчёта AI-аналитики",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

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
        profile: true,
        passport: true,
        parent: true,
        parentPlayers: { include: { parent: true } },
        parentInvites: { where: { status: "pending" }, orderBy: { createdAt: "desc" } },
        teamHistory: { orderBy: { createdAt: "desc" } },
        stats: { orderBy: { season: "desc" } },
        medical: true,
        skills: true,
        achievements: { orderBy: { year: "desc" } },
        videos: true,
        payments: { orderBy: [{ year: "desc" }, { month: "desc" }] },
        coachRatings: { include: { coach: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    return NextResponse.json(player);
  } catch (error) {
    console.error("GET /api/player/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки игрока",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

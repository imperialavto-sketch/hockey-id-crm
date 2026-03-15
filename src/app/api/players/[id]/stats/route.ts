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
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json([], { status: 200 });
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const stats = await prisma.playerStat.findMany({
      where: { playerId: id },
      orderBy: { season: "desc" },
    });
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/players/[id]/stats failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки статистики",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const { season, games, goals, assists, pim } = body;

    if (!season) {
      return NextResponse.json(
        { error: "Сезон обязателен" },
        { status: 400 }
      );
    }

    const g = typeof goals === "number" ? goals : parseInt(String(goals), 10) || 0;
    const a =
      typeof assists === "number" ? assists : parseInt(String(assists), 10) || 0;
    const points = g + a;

    const stat = await prisma.playerStat.create({
      data: {
        playerId: id,
        season: String(season).trim(),
        games: typeof games === "number" ? games : parseInt(String(games), 10) || 0,
        goals: g,
        assists: a,
        points,
        pim: typeof pim === "number" ? pim : parseInt(String(pim), 10) || 0,
      },
    });
    return NextResponse.json(stat);
  } catch (error) {
    console.error("POST /api/players/[id]/stats failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка сохранения статистики",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

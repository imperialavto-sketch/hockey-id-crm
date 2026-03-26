/**
 * GET /api/players/[id]/stats — player statistics.
 * PARENT: uses canParentAccessPlayer, returns aggregated object or null.
 * CRM roles: uses requirePermission + checkPlayerAccess, returns stats array.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { getParentPlayerStats } from "@/lib/parent-players";
import { canParentAccessPlayer } from "@/lib/parent-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (user.role === "PARENT" && user.parentId) {
    try {
      const canAccess = await canParentAccessPlayer(user.parentId, id);
      if (!canAccess) {
        return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
      }
      const stats = await getParentPlayerStats(user.parentId, id);
      return NextResponse.json(stats);
    } catch (error) {
      console.error("GET /api/players/[id]/stats (parent) failed:", error);
      return NextResponse.json(
        { error: "Ошибка загрузки статистики" },
        { status: 500 }
      );
    }
  }

  const { user: _u, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const player = await prisma.player.findUnique({ where: { id }, include: { team: true } });
    if (!player) return NextResponse.json([], { status: 200 });
    const accessRes = checkPlayerAccess(_u!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const stats = await prisma.playerStat.findMany({
      where: { playerId: id },
      orderBy: { season: "desc" },
    });
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/players/[id]/stats failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки статистики" },
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
      { error: "Ошибка сохранения статистики" },
      { status: 500 }
    );
  }
}

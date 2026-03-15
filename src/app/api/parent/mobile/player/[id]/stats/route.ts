/**
 * Parent Mobile API — player stats.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";

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

  const stats = await prisma.playerStat.findMany({
    where: { playerId: id },
    orderBy: { season: "desc" },
  });

  const latest = stats[0];
  if (!latest) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    games: latest.games,
    goals: latest.goals,
    assists: latest.assists,
    points: latest.points,
    pim: latest.pim,
  });
}

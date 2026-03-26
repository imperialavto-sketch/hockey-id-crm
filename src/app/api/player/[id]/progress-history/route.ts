/**
 * GET /api/player/[id]/progress-history
 * Returns monthly progress snapshots for the player.
 * Auth: CRM (session/cookie) or Parent (Bearer token).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { canParentAccessPlayer } from "@/lib/parent-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID игрока обязателен" },
        { status: 400 }
      );
    }

    const user = await getAuthFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    if (user.role === "PARENT" && user.parentId) {
      const canAccess = await canParentAccessPlayer(user.parentId, player.id);
      if (!canAccess) {
        return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
      }
    } else {
      const { res } = await requirePermission(req, "players", "view");
      if (res) return res;
      const accessRes = checkPlayerAccess(user, {
        ...player,
        team: player.team ?? undefined,
      });
      if (accessRes) return accessRes;
    }

    const snapshots = await prisma.playerProgressSnapshot.findMany({
      where: { playerId: id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(
      snapshots.map((s) => ({
        id: s.id,
        playerId: s.playerId,
        month: s.month,
        year: s.year,
        games: s.games,
        goals: s.goals,
        assists: s.assists,
        points: s.points,
        attendancePercent: s.attendancePercent ?? undefined,
        coachComment: s.coachComment ?? undefined,
        focusArea: s.focusArea ?? undefined,
        trend: (s.trend as "up" | "stable" | "down") ?? undefined,
        createdAt: s.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("[progress-history] GET failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки истории прогресса" },
      { status: 500 }
    );
  }
}

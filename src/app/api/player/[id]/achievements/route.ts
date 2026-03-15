/**
 * GET /api/player/[id]/achievements
 * Returns evaluated achievements (unlocked + locked) for the player.
 * Auth: CRM (session) or Parent (X-Parent-Id header).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { evaluatePlayerAchievements } from "@/lib/achievements/evaluate-player-achievements";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    include: {
      team: true,
      stats: { orderBy: { season: "desc" }, take: 1 },
      attendances: { select: { status: true } },
      progressSnapshots: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
      achievements: { orderBy: { createdAt: "desc" } },
    },
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

  try {
    const totalAttendances = player.attendances.length;
    const presentCount = player.attendances.filter((a) => a.status === "PRESENT").length;
    const attendancePercent =
      totalAttendances > 0
        ? Math.round((presentCount / totalAttendances) * 100)
        : undefined;

    const latestStat = player.stats[0]
      ? {
          games: player.stats[0].games,
          goals: player.stats[0].goals,
          assists: player.stats[0].assists,
          points: player.stats[0].points,
        }
      : null;

    const result = evaluatePlayerAchievements(id, {
      stats: latestStat,
      attendancePercent: attendancePercent ?? null,
      progressHistory: player.progressSnapshots.map((p) => ({ trend: p.trend ?? undefined })),
      manualAchievements: player.achievements.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        createdAt: a.createdAt,
      })),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/player/[id]/achievements failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки достижений",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/player/[id]/achievements/manual
 * Coach assigns a manual achievement to a player.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";
import { sendPushToParents } from "@/lib/notifications/sendPush";
import { getParentIdsForPlayer } from "@/lib/notifications/getParentsForPlayer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "edit");
  if (res) return res;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "ID игрока обязателен" },
        { status: 400 }
      );
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    });

    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }

    const accessRes = checkPlayerAccess(user!, {
      ...player,
      team: player.team ?? undefined,
    });
    if (accessRes) return accessRes;

    const body = await req.json().catch(() => ({}));
    const { title, description } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Название достижения обязательно" },
        { status: 400 }
      );
    }

    const achievement = await prisma.achievement.create({
      data: {
        playerId: id,
        title: title.trim(),
        year: new Date().getFullYear(),
        description: description ? String(description).trim() : null,
      },
    });

    const parentIds = await getParentIdsForPlayer(id);
    if (parentIds.length > 0) {
      void sendPushToParents(parentIds, {
        type: "achievement_unlocked",
        title: "Новое достижение",
        body: `${achievement.title}`,
        playerId: id,
        achievementCode: "manual",
      });
    }

    return NextResponse.json({
      id: achievement.id,
      code: "manual",
      title: achievement.title,
      description: achievement.description ?? "Персональное достижение от тренера",
      icon: "trophy",
      category: "coach",
      unlockedAt: achievement.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/player/[id]/achievements/manual failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка выдачи достижения",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

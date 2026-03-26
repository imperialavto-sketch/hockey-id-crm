/**
 * Parent Mobile API — coach recommendations.
 * Combines CoachRating recommendations and PlayerNote.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { apiError } from "@/lib/api-error";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return apiError("VALIDATION_ERROR", "ID игрока обязателен", 400);
  }

  try {
    const user = await getAuthFromRequest(req);

    const player = await prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      return apiError("NOT_FOUND", "Игрок не найден", 404);
    }

    if (user?.role !== "PARENT" || !user?.parentId) {
      return apiError("UNAUTHORIZED", "Необходима авторизация", 401);
    }
    const canAccess = await canParentAccessPlayer(user.parentId, player.id);
    if (!canAccess) {
      return apiError("FORBIDDEN", "Доступ запрещён", 403);
    }

    const [ratings, notes] = await Promise.all([
      prisma.coachRating.findMany({
        where: { playerId: id, recommendation: { not: null } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.playerNote.findMany({
        where: { playerId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const items: { id: string; text: string }[] = [];

    ratings.forEach((r) => {
      if (r.recommendation?.trim()) {
        items.push({ id: `rating-${r.id}`, text: r.recommendation.trim() });
      }
    });

    notes.forEach((n) => {
      if (n.note?.trim()) {
        items.push({ id: `note-${n.id}`, text: n.note.trim() });
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error(
      "GET /api/parent/mobile/player/[id]/recommendations error:",
      error
    );
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}

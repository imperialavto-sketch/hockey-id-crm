/**
 * Parent Mobile API — coach recommendations.
 * Combines CoachRating recommendations and PlayerNote.
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
}

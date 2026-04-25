/**
 * GET /api/parent/mobile/player/[id]/professional-stats
 * Parent-scoped read of Hockey ID professional stats — same payload as
 * GET /api/players/[id]/professional-stats (CRM), with parent access check.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { canParentAccessPlayer } from "@/lib/parent-access";
import { getProfessionalStatsPayload } from "@/lib/player-professional-stats-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const canAccess = await canParentAccessPlayer(user.parentId, id);
  if (!canAccess) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const payload = await getProfessionalStatsPayload(id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error(
      "GET /api/parent/mobile/player/[id]/professional-stats failed:",
      error
    );
    return NextResponse.json(
      { error: "Ошибка загрузки Hockey ID" },
      { status: 500 }
    );
  }
}

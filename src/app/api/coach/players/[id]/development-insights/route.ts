/**
 * GET /api/coach/players/[id]/development-insights
 * Компактная сводка развития игрока из отчётов + live-сигналов.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { buildPlayerDevelopmentInsightsForCoach } from "@/lib/player-development-insights";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(_req);
  if (res) return res;

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }
  const playerId = id.trim();

  const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
  if (accessibleIds !== null && !accessibleIds.includes(playerId)) {
    return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
  }

  const exists = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  try {
    const insights = await buildPlayerDevelopmentInsightsForCoach(user!, playerId);
    return NextResponse.json(insights);
  } catch (e) {
    console.error("GET .../development-insights failed:", e);
    return NextResponse.json(
      { error: "Не удалось построить сводку развития" },
      { status: 500 }
    );
  }
}

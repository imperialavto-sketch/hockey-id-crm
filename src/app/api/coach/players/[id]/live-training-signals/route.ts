/**
 * GET /api/coach/players/[id]/live-training-signals
 * Сигналы подтверждённых live training сессий по игроку (read-only).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { getPlayerLiveTrainingSignalsBundle } from "@/lib/live-training/get-coach-player-live-training-signals";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
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
    const data = await getPlayerLiveTrainingSignalsBundle(playerId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET .../live-training-signals failed:", e);
    return NextResponse.json({ error: "Не удалось загрузить сигналы" }, { status: 500 });
  }
}

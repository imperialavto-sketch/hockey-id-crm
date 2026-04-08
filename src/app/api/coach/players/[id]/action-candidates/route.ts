/**
 * GET /api/coach/players/[id]/action-candidates — PHASE 15 read-only кандидаты из live training.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { getCoachPlayerLiveTrainingActionCandidates } from "@/lib/live-training/build-coach-player-action-candidates";
import { enrichLiveTrainingActionCandidatesWithMaterialization } from "@/lib/live-training/enrich-live-training-action-candidates";

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
    const { items, lowData } = await getCoachPlayerLiveTrainingActionCandidates(playerId);
    const enriched = await enrichLiveTrainingActionCandidatesWithMaterialization(user!.id, items);
    return NextResponse.json({ playerId, items: enriched, lowData });
  } catch (e) {
    console.error("GET .../action-candidates failed:", e);
    return NextResponse.json({ error: "Не удалось загрузить кандидаты" }, { status: 500 });
  }
}

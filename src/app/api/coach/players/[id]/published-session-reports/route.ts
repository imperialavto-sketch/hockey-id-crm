/**
 * GET /api/coach/players/[id]/published-session-reports
 * Canonical history of published `TrainingSessionReport` for trainings the player attended.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { listCoachPublishedTrainingSessionReportHistoryForPlayer } from "@/lib/training-session-published-report-history";

function parseLimit(searchParams: URLSearchParams): number | undefined {
  const raw = searchParams.get("limit");
  if (raw === null || raw.trim() === "") return undefined;
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) ? n : undefined;
}

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
    const limit = parseLimit(req.nextUrl.searchParams);
    const items = await listCoachPublishedTrainingSessionReportHistoryForPlayer(
      user!,
      playerId,
      { limit }
    );
    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET .../published-session-reports failed:", e);
    return NextResponse.json(
      { error: "Не удалось загрузить историю отчётов" },
      { status: 500 }
    );
  }
}

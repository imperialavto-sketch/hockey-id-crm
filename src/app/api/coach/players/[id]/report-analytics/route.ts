/**
 * GET /api/coach/players/[id]/report-analytics
 * Эвристическая аналитика по истории канонических TrainingSessionReport (игрок + явка).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";
import { listCoachPublishedTrainingSessionReportAnalyticsInputForPlayer } from "@/lib/training-session-published-report-history";
import { computeTrainingSessionReportAnalytics } from "@/lib/training-session-report-analytics";
import { buildCoachTrainingSessionReportActionLayer } from "@/lib/training-session-report-action-layer";
import { buildCoachTaskSuggestionsFromReports } from "@/lib/training-session-report-task-suggestions";

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
    const rows = await listCoachPublishedTrainingSessionReportAnalyticsInputForPlayer(
      user!,
      playerId
    );
    const analytics = computeTrainingSessionReportAnalytics(rows);
    const actionLayer = buildCoachTrainingSessionReportActionLayer(analytics);
    const taskSuggestions = buildCoachTaskSuggestionsFromReports(analytics, actionLayer);
    return NextResponse.json({ ...analytics, actionLayer, taskSuggestions });
  } catch (e) {
    console.error("GET .../report-analytics failed:", e);
    return NextResponse.json(
      { error: "Не удалось построить аналитику отчётов" },
      { status: 500 }
    );
  }
}

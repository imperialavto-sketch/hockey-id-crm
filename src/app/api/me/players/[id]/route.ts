/**
 * GET /api/me/players/[id] — alias for parent-app compatibility.
 * Same auth and data scope as /api/parent/mobile/player/[id].
 * Returns BackendPlayer format expected by parent-app playerService.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import {
  getParentPlayerById,
  getParentLatestSessionEvaluation,
  getParentEvaluationSummary,
  getParentLatestSessionReport,
} from "@/lib/parent-players";
import type { ParentPlayerDetail } from "@/lib/parent-players";

/** BackendPlayer shape expected by parent-app playerService (single player, with stats fallback) */
function mapToBackendPlayer(
  p: NonNullable<ParentPlayerDetail>,
  latestSessionEvaluation: {
    effort?: number;
    focus?: number;
    discipline?: number;
    note?: string;
  } | null,
  evaluationSummary: {
    totalEvaluations: number;
    avgEffort: number | null;
    avgFocus: number | null;
    avgDiscipline: number | null;
  },
  latestSessionReport: {
    trainingId: string;
    summary?: string | null;
    focusAreas?: string | null;
    coachNote?: string | null;
    parentMessage?: string | null;
    updatedAt?: string;
  } | null
) {
  const age = new Date().getFullYear() - p.birthYear;
  const stat = p.stats[0];
  const games = stat?.games ?? 0;
  const goals = stat?.goals ?? 0;
  const assists = stat?.assists ?? 0;
  const points = stat?.points ?? goals + assists;
  const pim = stat?.pim ?? 0;

  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    name: `${p.firstName} ${p.lastName}`.trim() || "Игрок",
    birthYear: p.birthYear,
    age,
    position: p.position ?? null,
    parentId: p.parentId ?? null,
    teamId: p.teamId ?? null,
    team: p.team ? { name: p.team.name } : null,
    avatarUrl: p.photoUrl ?? null,
    avatar: p.photoUrl ?? null,
    games: games || null,
    goals: goals || null,
    assists: assists || null,
    points: points || null,
    pim: pim || null,
    stats:
      games || goals || assists || points || pim
        ? { games, goals, assists, points, pim }
        : null,
    latestSessionEvaluation: latestSessionEvaluation ?? undefined,
    evaluationSummary,
    latestSessionReport: latestSessionReport ?? undefined,
  };
}

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

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    const player = await getParentPlayerById(user.parentId, id);
    if (!player) {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }
    const [latestSessionEvaluation, evaluationSummary, latestSessionReport] =
      await Promise.all([
        getParentLatestSessionEvaluation(id),
        getParentEvaluationSummary(id, 90),
        getParentLatestSessionReport(id),
      ]);
    const item = mapToBackendPlayer(
      player,
      latestSessionEvaluation,
      evaluationSummary,
      latestSessionReport
    );
    return NextResponse.json(item);
  } catch (error) {
    console.error("GET /api/me/players/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки игрока" },
      { status: 500 }
    );
  }
}

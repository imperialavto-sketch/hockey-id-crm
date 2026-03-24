/**
 * GET /api/coach/reports/player/[playerId]
 * Coach-scoped player report detail.
 * Auth: Bearer (requireCrmRole).
 * Data: CoachSessionParentDraft + CoachSessionObservation + CoachSessionPlayerSnapshot.
 * 404 when no parent draft for this player.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";

function canAccessPlayer(
  accessibleIds: string[] | null,
  playerId: string
): boolean {
  if (accessibleIds === null) return true;
  return accessibleIds.includes(playerId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { playerId } = await params;
  if (!playerId) {
    return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
  }

  const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
  if (!canAccessPlayer(accessibleIds, playerId)) {
    return NextResponse.json({ error: "Нет доступа к игроку" }, { status: 403 });
  }

  try {
    const draft = await prisma.coachSessionParentDraft.findFirst({
      where: {
        playerId,
        coachSession: {
          coachUserId: user!.id,
          endedAt: { not: null },
        },
      },
      include: {
        coachSession: true,
      },
      orderBy: { coachSession: { endedAt: "desc" } },
    });

    // 200 with ready:false — frontend shows empty state, avoids marking whole path unavailable
    if (!draft) {
      return NextResponse.json({
        playerId,
        playerName: "Игрок",
        ready: false,
      });
    }

    const [observations, snapshots] = await Promise.all([
      prisma.coachSessionObservation.count({
        where: {
          coachSessionId: draft.coachSessionId,
          playerId,
        },
      }),
      prisma.coachSessionPlayerSnapshot.findFirst({
        where: {
          coachSessionId: draft.coachSessionId,
          playerId,
        },
      }),
    ]);

    const positives = Array.isArray(draft.positives) ? draft.positives : [];
    const improvementAreas = Array.isArray(draft.improvementAreas)
      ? draft.improvementAreas
      : [];
    const focusSkills = Array.isArray(draft.focusSkills) ? draft.focusSkills : [];

    let avgScore: number | undefined;
    if (snapshots?.skills && typeof snapshots.skills === "object") {
      const skills = Array.isArray(snapshots.skills)
        ? snapshots.skills
        : Object.values(snapshots.skills as Record<string, unknown>);
      const withScore = skills.filter(
        (s): s is { score?: number } =>
          typeof s === "object" && s !== null && typeof (s as { score?: number }).score === "number"
      );
      if (withScore.length > 0) {
        avgScore = Math.round(
          withScore.reduce((a, s) => a + (s.score ?? 0), 0) / withScore.length
        );
      }
    }

    const recommendations =
      focusSkills.length > 0
        ? [`Сфокусироваться на ${focusSkills.join(", ")}.`]
        : improvementAreas.slice(0, 2);

    const item = {
      playerId: draft.playerId,
      playerName: draft.playerName || "Игрок",
      observationsCount: observations,
      shortSummary: draft.headline?.trim() || draft.parentMessage?.trim() || undefined,
      keyPoints: positives.length > 0 ? positives : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      updatedAt: draft.coachSession.endedAt?.toISOString() ?? draft.coachSession.startedAt.toISOString(),
      ready: true,
      avgScore,
    };

    return NextResponse.json(item);
  } catch (error) {
    console.error("GET /api/coach/reports/player/[playerId] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки отчёта",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

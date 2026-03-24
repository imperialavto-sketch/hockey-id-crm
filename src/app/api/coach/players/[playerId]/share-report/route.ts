/**
 * GET /api/coach/players/[playerId]/share-report
 * Coach-scoped share message for parent.
 * Auth: Bearer (requireCrmRole).
 * Data: CoachSessionParentDraft.parentMessage.
 * 404 when no draft or empty parentMessage.
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
      include: { coachSession: true },
      orderBy: { coachSession: { endedAt: "desc" } },
    });

    const message = draft?.parentMessage?.trim();
    // 200 with ready:false + empty message — frontend shows empty state, avoids marking path unavailable
    if (!draft || !message) {
      return NextResponse.json({
        playerId,
        playerName: "Игрок",
        ready: false,
        message: "",
      });
    }

    const positives = Array.isArray(draft.positives) ? draft.positives : [];
    const improvementAreas = Array.isArray(draft.improvementAreas)
      ? draft.improvementAreas
      : [];

    const item = {
      playerId: draft.playerId,
      playerName: draft.playerName || "Игрок",
      ready: true,
      message,
      shortSummary: draft.headline?.trim() || undefined,
      keyPoints: positives.length > 0 ? positives : undefined,
      recommendations:
        improvementAreas.length > 0 ? improvementAreas : undefined,
      updatedAt:
        draft.coachSession.endedAt?.toISOString() ??
        draft.coachSession.startedAt.toISOString(),
    };

    return NextResponse.json(item);
  } catch (error) {
    console.error("GET /api/coach/players/[playerId]/share-report failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки сообщения",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

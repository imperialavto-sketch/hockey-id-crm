/**
 * GET /api/coach/sessions/[sessionId]/review
 * Session review summary for coach-app.
 * Auth: Bearer (requireCrmRole).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const { sessionId } = await params;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const coachUserId = user?.id ?? null;

    const session = await prisma.coachSession.findUnique({
      where: { sessionId },
      include: {
        observations: { orderBy: { createdAtTs: "desc" }, take: 20 },
        _count: { select: { observations: true } },
      },
    });

    if (!session) {
      return NextResponse.json(null);
    }

    if (session.coachUserId && coachUserId && session.coachUserId !== coachUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const playerIds = Array.from(new Set(session.observations.map((o) => o.playerId)));
    const playerCount = playerIds.length;
    const observationsCount = session._count.observations;

    const recentObservations = session.observations.map((o) => ({
      id: o.id,
      playerId: o.playerId,
      playerName: o.playerName,
      skillKey: o.skillType,
      impact: o.impact,
      noteText: o.note ?? undefined,
      createdAt: o.createdAtTs.toISOString(),
    }));

    return NextResponse.json({
      sessionId: session.sessionId,
      observationsCount,
      playersCount: playerCount,
      recentObservations,
      isReadyForReport: observationsCount > 0,
    });
  } catch (error) {
    console.error("GET /api/coach/sessions/[sessionId]/review failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}

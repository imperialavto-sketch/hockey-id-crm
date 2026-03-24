/**
 * GET /api/coach/sessions/[sessionId]/observations
 * List observations for a session.
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
      include: { observations: { orderBy: { createdAtTs: "desc" } } },
    });

    if (!session) {
      return NextResponse.json({ observations: [] });
    }

    if (session.coachUserId && coachUserId && session.coachUserId !== coachUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const observations = session.observations.map((o) => ({
      id: o.id,
      sessionId: session.sessionId,
      playerId: o.playerId,
      playerName: o.playerName,
      skillKey: o.skillType,
      impact: o.impact,
      noteText: o.note ?? undefined,
      createdAt: o.createdAtTs.toISOString(),
    }));

    return NextResponse.json({ observations });
  } catch (error) {
    console.error("GET /api/coach/sessions/[sessionId]/observations failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch observations" },
      { status: 500 }
    );
  }
}

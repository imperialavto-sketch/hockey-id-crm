/**
 * GET /api/coach/sessions/active
 * Return active session for coach. Optional ?teamId= filter.
 * Auth: Bearer (requireCrmRole).
 * Returns: { sessionId, teamId, startedAt, observationsCount } or null (204)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const coachUserId = user?.id ?? null;
    const teamId = req.nextUrl.searchParams.get("teamId")?.trim() || undefined;

    const where: { coachUserId?: string; teamId?: string; endedAt: null } = {
      endedAt: null,
    };
    if (coachUserId) where.coachUserId = coachUserId;
    if (teamId) where.teamId = teamId;

    const session = await prisma.coachSession.findFirst({
      where,
      orderBy: { startedAt: "desc" },
      include: { _count: { select: { observations: true } } },
    });

    if (!session) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      sessionId: session.sessionId,
      teamId: session.teamId ?? "",
      startedAt: session.startedAt.toISOString(),
      observationsCount: session._count.observations,
    });
  } catch (error) {
    console.error("GET /api/coach/sessions/active failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch active session" },
      { status: 500 }
    );
  }
}

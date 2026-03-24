/**
 * POST /api/coach/sessions/start
 * Start a new live training session.
 * Auth: Bearer (requireCrmRole).
 * Body: { teamId: string }
 * Returns: { sessionId, teamId, startedAt }
 * If coach already has an active session for this team, returns existing session (reuse).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid payload: expected JSON object" },
        { status: 400 }
      );
    }

    const teamId = typeof (body as { teamId?: unknown }).teamId === "string"
      ? (body as { teamId: string }).teamId.trim()
      : null;

    const coachUserId = user?.id ?? null;

    // Reuse: if active session exists for this coach+team, return it
    const existing = await prisma.coachSession.findFirst({
      where: {
        coachUserId: coachUserId ?? undefined,
        teamId: teamId ?? undefined,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });

    if (existing) {
      return NextResponse.json({
        sessionId: existing.sessionId,
        teamId: existing.teamId ?? teamId ?? "",
        startedAt: existing.startedAt.toISOString(),
      });
    }

    const sessionId = `sess_${createId()}`;
    const startedAt = new Date();

    await prisma.coachSession.create({
      data: {
        sessionId,
        title: "Practice Session",
        startedAt,
        endedAt: null,
        teamId,
        coachUserId,
      },
    });

    return NextResponse.json({
      sessionId,
      teamId: teamId ?? "",
      startedAt: startedAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/coach/sessions/start failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to start session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

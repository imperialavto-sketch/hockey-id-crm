/**
 * POST /api/coach/observations
 * Add observation to a live session.
 * Auth: Bearer (requireCrmRole).
 * Body: { sessionId, playerId, skillKey?, score?, noteText? }
 * score: 1=positive, -1=negative, 0=neutral
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import { prisma } from "@/lib/prisma";

function scoreToImpact(score: number): string {
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

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

    const o = body as { sessionId?: unknown; playerId?: unknown; skillKey?: unknown; score?: unknown; noteText?: unknown };
    const sessionId = typeof o.sessionId === "string" ? o.sessionId.trim() : "";
    const playerId = typeof o.playerId === "string" ? o.playerId.trim() : "";
    const skillKey = typeof o.skillKey === "string" ? o.skillKey.trim() : "general";
    const score = typeof o.score === "number" ? o.score : 0;
    const noteText = typeof o.noteText === "string" ? o.noteText.trim() || null : null;

    if (!sessionId || !playerId) {
      return NextResponse.json(
        { ok: false, error: "sessionId and playerId required" },
        { status: 400 }
      );
    }

    const coachUserId = user?.id ?? null;

    const session = await prisma.coachSession.findUnique({
      where: { sessionId },
    });

    if (!session || session.endedAt !== null) {
      return NextResponse.json(
        { ok: false, error: "Session not found or already ended" },
        { status: 404 }
      );
    }

    if (session.coachUserId && coachUserId && session.coachUserId !== coachUserId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const impact = scoreToImpact(score);
    const playerName = (o as { playerName?: unknown }).playerName;
    const name = typeof playerName === "string" ? playerName.trim() : "Player";

    const obs = await prisma.coachSessionObservation.create({
      data: {
        coachSessionId: session.id,
        playerId,
        playerName: name,
        skillType: skillKey,
        impact,
        note: noteText,
        createdAtTs: new Date(),
      },
    });

    return NextResponse.json({
      id: obs.id,
      sessionId: session.sessionId,
      playerId: obs.playerId,
      playerName: obs.playerName,
      skillKey: obs.skillType,
      impact: obs.impact,
      noteText: obs.note ?? undefined,
      createdAt: obs.createdAtTs.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/coach/observations failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create observation" },
      { status: 500 }
    );
  }
}

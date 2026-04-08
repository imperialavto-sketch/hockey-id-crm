/**
 * STEP 19: подтверждение / скрытие кандидата из suggestedActions.recommendedCoaches (без брони, чатов, уведомлений).
 * POST /api/live-training/sessions/[id]/external-coach-recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  confirmExternalCoachRecommendationForCoach,
  dismissExternalCoachRecommendationForCoach,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

function jsonError(e: LiveTrainingHttpError) {
  return NextResponse.json({ error: e.message, ...(e.body ?? {}) }, { status: e.statusCode });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  const sessionId = id?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const action = typeof o?.action === "string" ? o.action.trim() : "";

  try {
    if (action === "confirm") {
      const externalCoachId = typeof o?.externalCoachId === "string" ? o.externalCoachId : "";
      const playerIdRaw = o?.playerId;
      const playerId =
        playerIdRaw === null || playerIdRaw === undefined
          ? null
          : typeof playerIdRaw === "string"
            ? playerIdRaw
            : null;
      const recommendation = await confirmExternalCoachRecommendationForCoach(
        user!,
        sessionId,
        externalCoachId,
        playerId
      );
      return NextResponse.json({ recommendation });
    }

    if (action === "dismiss") {
      const recommendationId = typeof o?.recommendationId === "string" ? o.recommendationId : "";
      const recommendation = await dismissExternalCoachRecommendationForCoach(
        user!,
        sessionId,
        recommendationId
      );
      return NextResponse.json({ recommendation });
    }

    return NextResponse.json({ error: "Ожидалось action: confirm | dismiss" }, { status: 400 });
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return jsonError(e);
    }
    console.error("POST .../external-coach-recommendations failed:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}

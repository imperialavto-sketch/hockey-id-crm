/**
 * STEP 22: отзыв о внешней работе по ExternalCoachRecommendation (confirmed).
 * GET ?recommendationId= — чтение
 * POST { recommendationId, summary, focusAreas } — upsert
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  getExternalCoachFeedbackForCoach,
  saveExternalCoachFeedbackForCoach,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

function jsonError(e: LiveTrainingHttpError) {
  return NextResponse.json({ error: e.message, ...(e.body ?? {}) }, { status: e.statusCode });
}

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const recommendationId = new URL(req.url).searchParams.get("recommendationId")?.trim() ?? "";
  if (!recommendationId) {
    return NextResponse.json({ error: "Укажите recommendationId" }, { status: 400 });
  }

  try {
    const feedback = await getExternalCoachFeedbackForCoach(user!, recommendationId);
    return NextResponse.json({ feedback });
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return jsonError(e);
    }
    console.error("GET .../external-coach-feedback failed:", e);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const recommendationId = typeof o?.recommendationId === "string" ? o.recommendationId.trim() : "";
  const summary = typeof o?.summary === "string" ? o.summary : "";
  const focusAreasRaw = o?.focusAreas;
  const focusAreas = Array.isArray(focusAreasRaw)
    ? focusAreasRaw.filter((x): x is string => typeof x === "string")
    : [];

  if (!recommendationId) {
    return NextResponse.json({ error: "Укажите recommendationId" }, { status: 400 });
  }

  try {
    const feedback = await saveExternalCoachFeedbackForCoach(user!, recommendationId, summary, focusAreas);
    return NextResponse.json({ feedback });
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return jsonError(e);
    }
    console.error("POST .../external-coach-feedback failed:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}

/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * GET /api/live-training/sessions/[id]/report-draft — структурированный черновик отчёта (PHASE 11).
 * PATCH — сохранение coachPreviewNarrative в summaryJson (только status draft).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  getLiveTrainingSessionReportDraftForCoach,
  patchLiveTrainingSessionReportDraftCoachNarrativeForCoach,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

function jsonError(e: LiveTrainingHttpError) {
  return NextResponse.json({ error: e.message, ...(e.body ?? {}) }, { status: e.statusCode });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  try {
    const payload = await getLiveTrainingSessionReportDraftForCoach(user!, id.trim());
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return jsonError(e);
    }
    console.error("GET .../report-draft failed:", e);
    return NextResponse.json({ error: "Ошибка загрузки черновика" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const coachPreviewNarrative = o?.coachPreviewNarrative;
  if (coachPreviewNarrative == null || typeof coachPreviewNarrative !== "object") {
    return NextResponse.json({ error: "Ожидалось поле coachPreviewNarrative" }, { status: 400 });
  }

  try {
    const payload = await patchLiveTrainingSessionReportDraftCoachNarrativeForCoach(
      user!,
      id.trim(),
      coachPreviewNarrative
    );
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return jsonError(e);
    }
    console.error("PATCH .../report-draft failed:", e);
    return NextResponse.json({ error: "Ошибка сохранения черновика" }, { status: 500 });
  }
}

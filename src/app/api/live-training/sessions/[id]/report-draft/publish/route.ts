/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * POST .../report-draft/publish — **единственный** production writer канонического `TrainingSessionReport` (P0-1).
 * `GET/POST /api/trainings/:id/report` не пишет отчёт; POST там возвращает 405.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  LiveTrainingHttpError,
  publishLiveTrainingSessionReportDraftForCoach,
} from "@/lib/live-training/service";

function jsonError(e: LiveTrainingHttpError) {
  return NextResponse.json({ error: e.message, ...(e.body ?? {}) }, { status: e.statusCode });
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireCrmRole(_req);
  if (res) return res;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  try {
    const payload = await publishLiveTrainingSessionReportDraftForCoach(user!, id.trim());
    return NextResponse.json(payload);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return jsonError(e);
    }
    console.error("POST .../report-draft/publish failed:", e);
    return NextResponse.json({ error: "Ошибка публикации отчёта" }, { status: 500 });
  }
}

/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * GET /api/live-training/sessions/[id]/review-state — агрегат для экрана проверки.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  getLiveTrainingReviewState,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

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
    const reviewListScope =
      req.nextUrl.searchParams.get("reviewListScope") === "all" ? "all" : "exceptions";
    const state = await getLiveTrainingReviewState(user!, id.trim(), { reviewListScope });
    return NextResponse.json(state);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("GET .../review-state failed:", e);
    return NextResponse.json({ error: "Ошибка загрузки состояния" }, { status: 500 });
  }
}

/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * GET /api/live-training/sessions/[id] — деталь сессии (только владелец).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  getLiveTrainingSessionByIdForCoach,
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
    const session = await getLiveTrainingSessionByIdForCoach(user!, id.trim());
    return NextResponse.json(session);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("GET /api/live-training/sessions/[id] failed:", e);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

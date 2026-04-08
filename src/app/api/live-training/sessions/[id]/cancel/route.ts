/**
 * UNUSED LEGACY / NOT IN PRODUCT FLOW — route retained; no `coach-app` / `parent-app` caller in repo (grep `.../cancel`).
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`).
 * POST /api/live-training/sessions/[id]/cancel — отмена сессии (live | review); `cancelLiveTrainingSession` в `service.ts`.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  cancelLiveTrainingSession,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

export async function POST(
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
    const session = await cancelLiveTrainingSession(user!, id.trim());
    return NextResponse.json(session);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("POST .../cancel failed:", e);
    return NextResponse.json({ error: "Не удалось отменить сессию" }, { status: 500 });
  }
}

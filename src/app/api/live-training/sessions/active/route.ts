/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * GET /api/live-training/sessions/active — активная сессия (live | review) текущего пользователя.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  getActiveLiveTrainingSessionForCoach,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const session = await getActiveLiveTrainingSessionForCoach(user!);
    return NextResponse.json(session);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("GET /api/live-training/sessions/active failed:", e);
    return NextResponse.json(
      { error: "Не удалось загрузить активную сессию" },
      { status: 500 }
    );
  }
}

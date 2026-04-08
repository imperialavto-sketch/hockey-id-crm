/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * POST /api/live-training/sessions/[id]/confirm — review → confirmed.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  confirmLiveTrainingSession,
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
    const result = await confirmLiveTrainingSession(user!, id.trim());
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("POST .../confirm failed:", e);
    return NextResponse.json({ error: "Не удалось подтвердить сессию" }, { status: 500 });
  }
}

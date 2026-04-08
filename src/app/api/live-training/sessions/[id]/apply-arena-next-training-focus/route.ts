/**
 * POST — записать первый `nextTrainingFocus` из SessionMeaning в ближайший будущий слот TrainingSession.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  applyArenaNextTrainingFocusForCoach,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

function jsonError(e: LiveTrainingHttpError) {
  return NextResponse.json({ error: e.message, ...(e.body ?? {}) }, { status: e.statusCode });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requireCrmRole(_req);
  if (res) return res;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  try {
    const arenaNextTrainingFocusApply = await applyArenaNextTrainingFocusForCoach(user!, id.trim());
    return NextResponse.json({ arenaNextTrainingFocusApply });
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return jsonError(e);
    }
    console.error("POST .../apply-arena-next-training-focus failed:", e);
    return NextResponse.json({ error: "Ошибка применения фокуса" }, { status: 500 });
  }
}

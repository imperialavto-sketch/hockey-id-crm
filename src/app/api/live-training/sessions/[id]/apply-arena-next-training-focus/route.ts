/**
 * POST — coach: первый `nextTrainingFocus` из SessionMeaning → ближайший слот (тело пустое).
 * POST — CRM: `targetTrainingSessionId` + `focusLine` + опционально `explicitOverwrite: true`
 * для перезаписи непустого `arenaNextTrainingFocus` (без флага — 409 `ARENA_NEXT_FOCUS_SLOT_OCCUPIED`).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole, requirePermission } from "@/lib/api-rbac";
import {
  applyArenaNextTrainingFocusForCoach,
  applyArenaNextTrainingFocusForCrmWithExplicitTarget,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

function jsonError(e: LiveTrainingHttpError) {
  return NextResponse.json({ error: e.message, ...(e.body ?? {}) }, { status: e.statusCode });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const targetTrainingSessionId =
    typeof body.targetTrainingSessionId === "string" ? body.targetTrainingSessionId.trim() : "";
  const focusLine = typeof body.focusLine === "string" ? body.focusLine.trim() : "";
  const explicitOverwrite = body.explicitOverwrite === true;

  if (targetTrainingSessionId && focusLine) {
    const { user, res } = await requirePermission(req, "trainings", "edit");
    if (res) return res;
    try {
      const arenaNextTrainingFocusApply = await applyArenaNextTrainingFocusForCrmWithExplicitTarget(
        user!,
        id.trim(),
        targetTrainingSessionId,
        focusLine,
        explicitOverwrite
      );
      return NextResponse.json({ arenaNextTrainingFocusApply });
    } catch (e) {
      if (e instanceof LiveTrainingHttpError) {
        return jsonError(e);
      }
      console.error("POST .../apply-arena-next-training-focus (CRM explicit) failed:", e);
      return NextResponse.json({ error: "Ошибка применения фокуса" }, { status: 500 });
    }
  }

  const { user, res } = await requireCrmRole(req);
  if (res) return res;

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

/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * PATCH / DELETE .../sessions/[id]/drafts/[draftId] — правка черновика на review (PHASE 9).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  patchLiveTrainingObservationDraftForCoach,
  softDeleteLiveTrainingObservationDraftForCoach,
  type PatchLiveTrainingDraftBody,
} from "@/lib/live-training/live-training-draft-mutations";
import {
  LiveTrainingHttpError,
  toLiveTrainingDraftDtoWithCoachDecision,
} from "@/lib/live-training/service";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; draftId: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id: sessionId, draftId } = await ctx.params;
  if (!sessionId?.trim() || !draftId?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  let body: PatchLiveTrainingDraftBody;
  try {
    body = (await req.json()) as PatchLiveTrainingDraftBody;
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  try {
    const updated = await patchLiveTrainingObservationDraftForCoach(
      user!,
      sessionId.trim(),
      draftId.trim(),
      body
    );
    const dto = await toLiveTrainingDraftDtoWithCoachDecision(user!, sessionId.trim(), updated);
    return NextResponse.json(dto);
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("PATCH .../drafts/[draftId] failed:", e);
    return NextResponse.json({ error: "Не удалось обновить черновик" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; draftId: string }> }
) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  const { id: sessionId, draftId } = await ctx.params;
  if (!sessionId?.trim() || !draftId?.trim()) {
    return NextResponse.json({ error: "Некорректный идентификатор" }, { status: 400 });
  }

  try {
    await softDeleteLiveTrainingObservationDraftForCoach(user!, sessionId.trim(), draftId.trim());
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("DELETE .../drafts/[draftId] failed:", e);
    return NextResponse.json({ error: "Не удалось удалить черновик" }, { status: 500 });
  }
}

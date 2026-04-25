/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * GET /api/live-training/sessions/[id]/action-candidates — PHASE 15 по итогам сессии.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  getLiveTrainingSessionByIdForCoach,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";
import { augmentLiveTrainingSessionActionCandidatesWithSupercore } from "@/lib/arena/supercore/merge-supercore-focus-decisions-into-action-candidates";
import { listLiveTrainingSessionActionCandidatesWithMeaningMvp } from "@/lib/live-training/session-meaning-action-candidate";
import { enrichLiveTrainingActionCandidatesWithMaterialization } from "@/lib/live-training/enrich-live-training-action-candidates";
import { sortLiveTrainingActionCandidates } from "@/lib/live-training/live-training-action-candidate-rules";

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
    if (session.status !== "confirmed" || !session.outcome) {
      return NextResponse.json({
        sessionId: session.id,
        items: [],
        lowData: true,
      });
    }
    const raw = listLiveTrainingSessionActionCandidatesWithMeaningMvp(
      session.outcome,
      session.id,
      session.startedAt,
      session.sessionMeaningJson?.nextActions
    );
    // Supercore pass 7: доп. кандидаты из ArenaCoreBindings (focus decisions); тот же префикс id для materialize.
    const augmented = await augmentLiveTrainingSessionActionCandidatesWithSupercore({
      items: raw,
      sessionId: session.id,
      sessionStartedAt: session.startedAt,
      outcome: session.outcome,
    });
    const forEnrich =
      augmented.length !== raw.length || augmented.length > 7
        ? sortLiveTrainingActionCandidates(augmented, 7)
        : augmented;
    const items = await enrichLiveTrainingActionCandidatesWithMaterialization(user!.id, forEnrich);
    return NextResponse.json({
      sessionId: session.id,
      items,
      lowData: items.length === 0,
    });
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error("GET .../action-candidates (session) failed:", e);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

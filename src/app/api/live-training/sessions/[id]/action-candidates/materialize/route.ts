/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * POST /api/live-training/sessions/[id]/action-candidates/materialize — PHASE 16
 * Body: { candidateId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCrmRole } from "@/lib/api-rbac";
import { materializeSessionLiveTrainingActionCandidate } from "@/lib/live-training/materialize-live-training-action-candidate";

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
  const sessionId = id.trim();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>).candidateId : undefined;
  const candidateId = typeof raw === "string" ? raw.trim() : "";
  if (!candidateId) {
    return NextResponse.json({ error: "Поле candidateId обязательно" }, { status: 400 });
  }

  try {
    const result = await materializeSessionLiveTrainingActionCandidate(user!, sessionId, candidateId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      alreadyExists: result.alreadyExists,
      materializedItem: result.materializedItem,
    });
  } catch (e) {
    console.error("POST session .../action-candidates/materialize failed:", e);
    return NextResponse.json({ error: "Не удалось создать задачу" }, { status: 500 });
  }
}

// [LEGACY — DO NOT EXPAND] — `Training` CRUD; canonical slot is `TrainingSession`.
// ARCHITECTURE FREEZE: LEGACY — `Training` model + `/api/legacy/trainings/*`; SSOT session is `TrainingSession` + `/api/trainings/*`. See docs/ARCHITECTURE_FREEZE_PHASE_0.md
// PHASE 2 API LOCK — LEGACY_API_FAMILY (`docs/PHASE_2_API_ROUTE_LOCK.md`, `apiContours.ts`). DO NOT EXPAND.
//
// GUARDRAIL — `docs/architecture/HOCKEY_ID_SSOT.md`, `docs/architecture/HOCKEY_ID_USAGE_INVENTORY.md`:
// Legacy / transitional surface. No new product features here.
// Canonical school training SSOT: `TrainingSession` + `/api/trainings/*` (and related canonical routes).
// Migration target for callers: canonical school training + `TrainingAttendance` APIs only.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTraining } from "@/lib/data-scope";
import { warnLegacyTrainingContourWrite } from "@/lib/legacy/legacyIsolationMarkers";
import { legacyTrainingApiGoneResponse } from "@/lib/legacy/legacyTrainingApiGone";

/**
 * STAGE 1: GET removed (410). Canonical: `GET /api/trainings/[id]` (TrainingSession). PATCH/DELETE unchanged.
 */
export async function GET(
  _req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  return legacyTrainingApiGoneResponse("GET /api/legacy/trainings/[id]");
}

/**
 * Legacy compatibility update for Training model.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  warnLegacyTrainingContourWrite("PATCH /api/legacy/trainings/[id]");

  try {
    const { id } = await params;
    const training = await prisma.training.findUnique({
      where: { id },
      include: { team: true },
    });

    if (!training) {
      return NextResponse.json({ error: "Тренировка не найдена" }, { status: 404 });
    }

    if (!canAccessTraining(user!, { ...training, team: training.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.title != null) data.title = String(body.title).trim();
    if (body.startTime != null) {
      const d = new Date(body.startTime);
      if (!Number.isNaN(d.getTime())) data.startTime = d;
    }
    if (body.endTime != null) {
      const d = new Date(body.endTime);
      if (!Number.isNaN(d.getTime())) data.endTime = d;
    }
    if (body.location !== undefined) data.location = body.location ? String(body.location).trim() : null;
    if (body.teamId != null) data.teamId = String(body.teamId).trim();
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;

    // PHASE 1 WRITE-RISK: legacy `Training` table — no new product features here; canonical slot is `TrainingSession`.
    const updated = await prisma.training.update({
      where: { id },
      data,
      include: {
        team: { include: { coach: true } },
        attendances: { include: { player: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/legacy/trainings/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка обновления legacy-тренировки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Legacy compatibility delete for Training model.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "delete");
  if (res) return res;
  warnLegacyTrainingContourWrite("DELETE /api/legacy/trainings/[id]");

  try {
    const { id } = await params;
    const training = await prisma.training.findUnique({
      where: { id },
      include: { team: true },
    });

    if (!training) {
      return NextResponse.json({ error: "Тренировка не найдена" }, { status: 404 });
    }

    if (!canAccessTraining(user!, { ...training, team: training.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }

    // PHASE 1 WRITE-RISK: legacy `Training` delete only via this route.
    await prisma.training.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/legacy/trainings/[id] failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка удаления legacy-тренировки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

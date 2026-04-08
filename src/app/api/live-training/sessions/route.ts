/**
 * PHASE 2 API LOCK — CANONICAL_LIVE_TRAINING_API (`docs/PHASE_2_API_ROUTE_LOCK.md`, `src/lib/architecture/apiContours.ts`).
 * POST /api/live-training/sessions — создать живую тренировку.
 * Auth: CRM (Bearer / cookie), как у /api/coach/*.
 *
 * ARCHITECTURE FREEZE: SSOT — LiveTrainingSession HTTP API. The retired `/api/coach/sessions/*` family returns 410.
 * See docs/ARCHITECTURE_FREEZE_PHASE_0.md
 * PHASE 1: `LIVE_TRAINING_SSOT` — `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md`.
 */

import { NextRequest, NextResponse } from "next/server";
import type { LiveTrainingMode } from "@prisma/client";
import { requireCrmRole } from "@/lib/api-rbac";
import {
  createLiveTrainingSession,
  LiveTrainingHttpError,
} from "@/lib/live-training/service";

const MODES: LiveTrainingMode[] = ["ice", "ofp", "mixed"];

function handleError(e: unknown): NextResponse {
  if (e instanceof LiveTrainingHttpError) {
    return NextResponse.json(
      { error: e.message, ...(e.body ?? {}) },
      { status: e.statusCode }
    );
  }
  console.error("POST /api/live-training/sessions failed:", e);
  return NextResponse.json(
    { error: "Не удалось создать сессию" },
    { status: 500 }
  );
}

export async function POST(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const body = (await req.json()) as {
      teamId?: string;
      groupId?: string | null;
      mode?: string;
      /** Слот CRM (`TrainingSession.id`); опционально, дублирует `scheduleSlotContext.trainingSlotId`. */
      trainingSessionId?: string | null;
      planningSnapshot?: unknown;
      scheduleSlotContext?: unknown;
    };
    const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
    const modeRaw = typeof body.mode === "string" ? body.mode.trim() : "";
    if (!teamId) {
      return NextResponse.json({ error: "Укажите команду" }, { status: 400 });
    }
    const mode = modeRaw as LiveTrainingMode;
    if (!MODES.includes(mode)) {
      return NextResponse.json(
        { error: "Некорректный тип тренировки (ice, ofp, mixed)" },
        { status: 400 }
      );
    }

    const planningSnapshot =
      "planningSnapshot" in body ? body.planningSnapshot : undefined;
    const scheduleSlotContext =
      "scheduleSlotContext" in body ? body.scheduleSlotContext : undefined;

    const groupId =
      body.groupId === null || body.groupId === undefined
        ? body.groupId
        : typeof body.groupId === "string"
          ? body.groupId.trim() || null
          : undefined;

    const trainingSessionId =
      body.trainingSessionId === null || body.trainingSessionId === undefined
        ? body.trainingSessionId
        : typeof body.trainingSessionId === "string"
          ? body.trainingSessionId.trim() || null
          : undefined;

    const session = await createLiveTrainingSession(user!, {
      teamId,
      mode,
      ...(groupId !== undefined ? { groupId } : {}),
      ...(trainingSessionId !== undefined ? { trainingSessionId } : {}),
      planningSnapshot,
      scheduleSlotContext,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

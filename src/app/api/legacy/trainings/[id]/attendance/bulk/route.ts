/**
 * [LEGACY — DO NOT EXPAND]
 *
 * PHASE 2 API LOCK — LEGACY_API_FAMILY — compatibility only. DO NOT EXPAND.
 *
 * GUARDRAIL — `docs/architecture/HOCKEY_ID_SSOT.md`, `docs/architecture/HOCKEY_ID_USAGE_INVENTORY.md`:
 * Legacy bulk attendance (`Attendance` → `Training`). No new features.
 * Canonical SSOT: `TrainingSession` + `/api/trainings/[id]/attendance/bulk`.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTraining } from "@/lib/data-scope";
import {
  logLegacyTrainingHttpWrite,
  warnLegacyTrainingContourWrite,
} from "@/lib/legacy/legacyIsolationMarkers";
import {
  isLegacyTrainingHttpWritesEnabled,
  legacyTrainingHttpWritesDisabledResponse,
} from "@/lib/legacy/legacyTrainingHttpWriteGuard";

const LEGACY_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

/**
 * Legacy compatibility bulk attendance mutation endpoint.
 * PHASE 1 WRITE-RISK: bulk upsert into legacy `Attendance`. School SSOT: `TrainingAttendance`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;
  const { id: trainingId } = await params;
  if (!trainingId) {
    return NextResponse.json({ error: "ID тренировки обязателен" }, { status: 400 });
  }
  if (!isLegacyTrainingHttpWritesEnabled()) {
    logLegacyTrainingHttpWrite(req, {
      event: "legacy_training_write_attempt",
      surface: "POST /api/legacy/trainings/[id]/attendance/bulk",
      method: "POST",
      trainingId,
      userId: user!.id,
      outcomeStage: "policy_disabled",
    });
    return legacyTrainingHttpWritesDisabledResponse();
  }
  warnLegacyTrainingContourWrite("POST /api/legacy/trainings/[id]/attendance/bulk");
  logLegacyTrainingHttpWrite(req, {
    event: "legacy_training_write_attempt",
    surface: "POST /api/legacy/trainings/[id]/attendance/bulk",
    method: "POST",
    trainingId,
    userId: user!.id,
    outcomeStage: "before_write",
  });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { status, playerIds } = body;
    if (
      typeof status !== "string" ||
      !LEGACY_STATUSES.includes(status as (typeof LEGACY_STATUSES)[number])
    ) {
      return NextResponse.json(
        { error: "Недопустимый статус посещаемости" },
        { status: 400 }
      );
    }

    const training = await prisma.training.findUnique({
      where: { id: trainingId },
      include: { team: true },
    });
    if (!training) {
      return NextResponse.json({ error: "Тренировка не найдена" }, { status: 404 });
    }
    if (!canAccessTraining(user!, { ...training, team: training.team ?? undefined })) {
      return NextResponse.json({ error: "Нет доступа к тренировке" }, { status: 403 });
    }

    const ids: string[] = Array.isArray(playerIds)
      ? playerIds.filter((x: unknown): x is string => typeof x === "string")
      : [];
    if (ids.length === 0) {
      const teamPlayers = await prisma.player.findMany({
        where: { teamId: training.teamId },
        select: { id: true },
      });
      ids.push(...teamPlayers.map((p) => p.id));
    }

    const statusVal = status as (typeof LEGACY_STATUSES)[number];
    const results = await Promise.all(
      ids.map(async (playerId: string) => {
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player || player.teamId !== training.teamId) return null;
        // PHASE 1: legacy `Attendance` — parallel to `TrainingAttendance` SSOT.
        return prisma.attendance.upsert({
          where: {
            trainingId_playerId: { trainingId, playerId },
          },
          create: {
            trainingId,
            playerId,
            status: statusVal,
          },
          update: { status: statusVal },
        });
      })
    );

    const bulkUpdatedCount = results.filter(Boolean).length;
    logLegacyTrainingHttpWrite(req, {
      event: "legacy_training_write_committed",
      surface: "POST /api/legacy/trainings/[id]/attendance/bulk",
      method: "POST",
      trainingId,
      userId: user!.id,
      outcomeStage: "committed",
      bulkUpdatedCount,
    });
    return NextResponse.json({ updated: bulkUpdatedCount });
  } catch (error) {
    console.error("POST /api/legacy/trainings/[id]/attendance/bulk failed:", error);
    return NextResponse.json(
      { error: "Ошибка массовой legacy-отметки посещаемости" },
      { status: 500 }
    );
  }
}

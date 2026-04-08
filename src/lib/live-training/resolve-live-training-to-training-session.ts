import type { Prisma } from "@prisma/client";
import { parsePlanningSnapshotFromDb } from "@/lib/live-training/live-training-planning-snapshot";

/**
 * Канонический id слота CRM (`TrainingSession.id`) из строки `LiveTrainingSession`.
 * SSOT для live→slot: колонка, затем `planningSnapshotJson.scheduleSlotContext.trainingSlotId`.
 */
export function getCanonicalTrainingSessionIdFromLiveRow(row: {
  trainingSessionId: string | null;
  planningSnapshotJson: unknown;
}): string | null {
  const col =
    typeof row.trainingSessionId === "string" ? row.trainingSessionId.trim() : "";
  if (col) return col;

  const snap = parsePlanningSnapshotFromDb(
    row.planningSnapshotJson as Prisma.JsonValue | null | undefined
  );
  const slot = snap?.scheduleSlotContext?.trainingSlotId?.trim() ?? "";
  return slot || null;
}

/**
 * SSOT (read-only): canonical `TeamGroup.id` for a live training session — specification + resolver.
 *
 * Sources verified in code (no Prisma column on `LiveTrainingSession`):
 * - Root `groupId` inside `planningSnapshotJson` (set at create via `composePlanningSnapshotJsonForCreate`,
 *   parsed by `parsePlanningSnapshotFromDb` → `LiveTrainingPlanningSnapshotDto.groupId`).
 * - Nested `planningSnapshotJson.scheduleSlotContext.groupId` (`parseScheduleSlotContextBlock`).
 * - `TrainingSession.groupId` for the CRM slot linked to the session (`LiveTrainingSession.trainingSessionId`
 *   or slot id from `getCanonicalTrainingSessionIdFromLiveRow`); caller supplies this as optional input.
 *
 * Lifecycle: snapshot is written at **create**; `trainingSessionId` column may be filled at **first confirm**
 * from stored planning (`tryResolveTrainingSessionIdFromStoredPlanning`). Slot `groupId` in DB can change
 * after live creation without mutating the JSON snapshot — treat as possible drift vs. snapshot.
 *
 * This module does not write to the DB, call APIs, or change signals.
 */

import type { Prisma } from "@prisma/client";
import { parsePlanningSnapshotFromDb } from "@/lib/live-training/live-training-planning-snapshot";

function trimGroupId(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, 64) : null;
}

/**
 * Deterministic canonical group id for one live session row (pure function).
 *
 * **Priority (first wins):**
 * 1. Root `groupId` on the parsed planning snapshot **when the property is present** on the parsed DTO
 *    (including explicit `null` / empty → canonical **no group** for the session intent frozen in JSON).
 * 2. Else `scheduleSlotContext.groupId` from the same snapshot (non-empty string only).
 * 3. Else `linkedTrainingSessionGroupId` from the caller (typically `TrainingSession.groupId` for the
 *    resolved slot id in the same team).
 * 4. Else `null`.
 *
 * **Mismatch:** If (1) is a non-empty id and (2) or (3) differ — canonical remains (1); treat extra ids as
 * **data drift** (operational slot or nested context not updated to match snapshot). No logging here by design.
 */
export function canonicalGroupIdForLiveSession(input: {
  planningSnapshotJson: unknown;
  /** Pass when caller has loaded `TrainingSession` for the linked slot (same `teamId` as live). */
  linkedTrainingSessionGroupId?: string | null;
}): string | null {
  const snap = parsePlanningSnapshotFromDb(
    input.planningSnapshotJson as Prisma.JsonValue | null | undefined
  );

  if (snap != null && Object.prototype.hasOwnProperty.call(snap, "groupId")) {
    return trimGroupId(snap.groupId ?? null);
  }

  const fromSlotContext = trimGroupId(snap?.scheduleSlotContext?.groupId ?? null);
  if (fromSlotContext) return fromSlotContext;

  return trimGroupId(input.linkedTrainingSessionGroupId ?? null);
}

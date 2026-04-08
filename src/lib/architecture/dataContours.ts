/**
 * PHASE 1 — Data architecture lock (documentation / grep anchors only).
 * These constants are not enforced at runtime; they align naming with `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md`.
 * Phase 2 HTTP families: `apiContours.ts`, `docs/PHASE_2_API_ROUTE_LOCK.md`.
 * Phase 3 app flows: `appFlowContours.ts`, `docs/PHASE_3_APP_FLOW_LOCK.md`.
 * Phase 4 isolation: `isolationContours.ts`, `docs/PHASE_4_DEAD_PATH_ISOLATION.md`.
 */

/** School calendar + attendance for scheduled sessions (`TrainingSession`, `TrainingAttendance`). */
export const CORE_SCHOOL_TRAINING_SSOT = "TrainingSession+TrainingAttendance" as const;

/** Coach live runtime (`LiveTrainingSession`, `/api/live-training/sessions/*`). */
export const LIVE_TRAINING_SSOT = "LiveTrainingSession" as const;

/** Product messaging (`ChatConversation`, `ChatMessage`). */
export const MESSAGING_SSOT = "ChatConversation+ChatMessage" as const;

/** Parent ↔ player access (`ParentPlayer`); not `Player.parentId` alone. */
export const PARENT_PLAYER_SSOT = "ParentPlayer" as const;

/** CRM-era `Training` + legacy attendance on `Training`. */
export const LEGACY_TRAINING_CONTOUR = "Training+Attendance(legacy)" as const;

/** Legacy `Message` table; not active chat. */
export const LEGACY_MESSAGING_CONTOUR = "Message" as const;

/** `ExternalTrainingRequest` / `ExternalTrainingReport` + `/api/arena/external-training/*`. */
export const NON_CORE_EXTERNAL_CONTOUR = "ExternalTraining" as const;

/** Marketplace models + `/api/marketplace/*`. */
export const NON_CORE_MARKETPLACE_CONTOUR = "Marketplace" as const;

/** Schedule behavioral hints from live signals (`LiveTrainingPlayerSignal`, domain behavior). */
export const TRAINING_BEHAVIORAL_SUGGESTIONS_SSOT =
  "LiveTrainingPlayerSignal:behavior+attention|discipline" as const;

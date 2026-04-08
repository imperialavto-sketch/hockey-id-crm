/**
 * PHASE 2 — API route lock (documentation / grep anchors only).
 * See `docs/PHASE_2_API_ROUTE_LOCK.md`. Not enforced at runtime.
 *
 * Pairs with `dataContours.ts` (Phase 1 data SSOT) — HTTP path families here, Prisma entities there.
 * Phase 3 screen→service binding: `appFlowContours.ts`, `docs/PHASE_3_APP_FLOW_LOCK.md`.
 * Phase 4 stub/frozen inventory: `isolationContours.ts`, `docs/PHASE_4_DEAD_PATH_ISOLATION.md`.
 */

/** Coach live training HTTP API. */
export const CANONICAL_LIVE_TRAINING_API = "/api/live-training/*" as const;

/** School `TrainingSession` + related: CRUD, batch, attendance, reports, evaluations, etc. */
export const CANONICAL_SCHOOL_TRAINING_API = "/api/trainings/*" as const;

/** Coach weekly grid create/list (same data model as trainings). */
export const CANONICAL_COACH_SCHEDULE_API = "/api/coach/schedule" as const;

/** Product chat: list/create threads, messages, read receipts. */
export const CANONICAL_CHAT_CONVERSATIONS_API = "/api/chat/conversations/*" as const;

/** Coach-facing inbox/detail/send over `ChatConversation` / `ChatMessage`. */
export const CANONICAL_COACH_MESSAGES_API = "/api/coach/messages/*" as const;

/** Combined messaging surface (doc shorthand). */
export const CANONICAL_MESSAGING_API =
  "/api/chat/conversations/* + /api/coach/messages/*" as const;

/** Parent Bearer school profile, schedule, players, subscription endpoints under `/api/me`. */
export const CANONICAL_PARENT_ME_API = "/api/me/*" as const;

/** Behavioral 1–5 suggestions for structured metrics (live `LiveTrainingPlayerSignal`). */
export const CANONICAL_TRAINING_BEHAVIORAL_SUGGESTIONS_API =
  "/api/trainings/[id]/behavioral-suggestions" as const;

/** Legacy CRM training/attendance compatibility. DO NOT EXPAND. */
export const LEGACY_API_FAMILY = "/api/legacy/*" as const;

/** LEGACY / DO NOT USE / REMOVE IN FUTURE CLEANUP — GET → 410; zero in-repo product clients. */
export const LEGACY_DISABLED_MESSAGES_API = "/api/messages" as const;

/** Empty-list stub; not `/api/chat/conversations/.../messages`. */
/** Step 11B: HTTP route удалён; не вызывать. SSOT: `/api/chat/conversations/*`. */
export const STUB_CHAT_MESSAGES_API = "/api/chat/messages" as const;

/** Empty-list stub; not team channel SSOT. */
/** Step 11B: HTTP route удалён; не вызывать. */
export const STUB_TEAM_MESSAGES_API = "/api/team/messages" as const;

/** Legacy aggregate over `Attendance` → `Training`. */
export const LEGACY_AGGREGATE_ATTENDANCE_API = "/api/attendance" as const;

/** External training request/report + demo match stub. */
export const NON_CORE_EXTERNAL_API = "/api/arena/external-training/*" as const;

/** Marketplace coaches/bookings. */
export const NON_CORE_MARKETPLACE_API = "/api/marketplace/*" as const;

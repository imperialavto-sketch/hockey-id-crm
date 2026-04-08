/**
 * PHASE 3 — App flow binding lock (documentation / grep anchors only).
 * Screen → service → API → data SSOT. See `docs/PHASE_3_APP_FLOW_LOCK.md`.
 * Pair with `apiContours.ts` (HTTP) and `dataContours.ts` (Prisma SSOT).
 * Phase 4 dead/stub surfaces: `isolationContours.ts`, `docs/PHASE_4_DEAD_PATH_ISOLATION.md`.
 */

export const COACH_CANONICAL_LIVE_FLOW = "coach:liveTrainingService->/api/live-training/*->LiveTrainingSession" as const;

export const COACH_CANONICAL_SCHEDULE_FLOW =
  "coach:coachScheduleService->/api/coach/schedule+/api/trainings/*->TrainingSession" as const;

export const COACH_CANONICAL_MESSAGING_FLOW =
  "coach:coachMessagesService->/api/coach/messages/*->ChatConversation+ChatMessage" as const;

export const COACH_CANONICAL_PLAYER_FLOW =
  "coach:coachPlayersService->/api/coach/players*->coach-scoped player DTOs" as const;

export const PARENT_CANONICAL_CHAT_FLOW =
  "parent:chatService->/api/chat/conversations/*->ChatConversation+ChatMessage" as const;

export const PARENT_CANONICAL_SCHEDULE_FLOW =
  "parent:scheduleService->/api/me/schedule->TrainingSession-backed" as const;

export const PARENT_CANONICAL_PLAYER_FLOW =
  "parent:playerService(core)->/api/me/players*->ParentPlayer+TrainingSession views" as const;

export const COACH_SCHEDULE_BEHAVIORAL_SUGGESTIONS_FLOW =
  "coach:coachScheduleService->GET /api/trainings/[id]/behavioral-suggestions->LiveTrainingPlayerSignal(behavior)" as const;

export const NON_CORE_EXTERNAL_FLOW =
  "parent:arenaExternalTrainingService->/api/arena/external-training/*->ExternalTraining*" as const;

export const NON_CORE_MARKETPLACE_FLOW =
  "parent:marketplaceService->/api/marketplace/*->marketplace models" as const;

/** e.g. `playerService` multi-family, or home screen combining many services — review before extending. */
export const MIXED_BINDING_RISK_FLOW = "mixed:multiple API families in one module/screen" as const;

/** Do not wire new product UI to legacy/parallel/stub HTTP families (see PHASE_2 doc). */
export const DO_NOT_BIND_TO_LEGACY_FLOW =
  "forbidden:/api/coach/sessions*,/api/legacy*,/api/messages,removed /api/chat/messages + /api/team/messages (Step 11B),legacy /api/attendance" as const;

/** Team community feed/members — not `ChatMessage` SSOT; `/api/team/messages` route removed (Step 11B). */
export const PARENT_TEAM_COMMUNITY_AUX_FLOW =
  "parent:teamService->/api/team/* (posts/members; team messages helpers local empty — route removed Step 11B)" as const;

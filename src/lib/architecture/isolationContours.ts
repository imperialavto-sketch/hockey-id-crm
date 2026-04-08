/**
 * PHASE 4 — Dead path / stub / frozen surface anchors (documentation + grep only).
 * See `docs/PHASE_4_DEAD_PATH_ISOLATION.md`.
 */

/** Step 11B: route removed; string kept for grep/docs. Not chat SSOT. */
export const STUB_TEAM_MESSAGES_SURFACE = "/api/team/messages" as const;

/** Step 11B: route removed; string kept for grep/docs. */
export const STUB_CHAT_MESSAGES_SURFACE = "/api/chat/messages" as const;

/** `GET /api/attendance` — legacy `Attendance` aggregate. */
export const LEGACY_ATTENDANCE_SURFACE = "/api/attendance" as const;

/** `/api/legacy/*` — CRM `Training` / legacy attendance. */
export const LEGACY_TRAINING_SURFACE = "/api/legacy/*" as const;

/** `parent-app/services/playerService.ts` — multiple HTTP families; section-contained until split. */
export const MIXED_PLAYER_SERVICE_SURFACE = "playerService.ts" as const;

/** `teamService` posts/members — community auxiliary; not `ChatMessage` SSOT. */
export const AUX_TEAM_COMMUNITY_SURFACE = "teamService: posts + members" as const;

/** Shorthand list of HTTP families safe for **new** school/live/human-chat product work. */
export const CANONICAL_ALLOWED_PRODUCT_SURFACES =
  "/api/live-training/*, /api/trainings/*, /api/coach/schedule, /api/chat/conversations/*, /api/coach/messages/*, /api/me/*" as const;

/** Surfaces with zero in-repo importers or intentional non-use — verify before delete. */
export const CANDIDATE_LATER_REMOVAL_SURFACE =
  "teamService.getTeamMessages|sendTeamMessage (dormant in repo)" as const;

/** Prefer services over raw `apiFetch` in screens for core flows. */
export const DO_NOT_BIND_SCREEN_DIRECTLY =
  "screens: avoid new raw fetch to stub/legacy/parallel routes" as const;

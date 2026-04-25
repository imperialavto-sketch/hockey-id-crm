/**
 * Verification-first inventory: **load / exposure proxies** available in OLTP + current Arena heuristics.
 *
 * - **Not** an ontology SSOT, **not** medical or physiological load truth, **not** a product API.
 * - Documents **actual** semantics of `evaluatePlayerLoad` and adjacent Prisma models **without** changing runtime behavior.
 *
 * Primary semantic gap to preserve when designing a future player exposure helper:
 * - `weeklySessions` counts **team scheduled** `TrainingSession` rows (not `TrainingAttendance` per player).
 *
 * @module arena-load-exposure-proxies-inventory
 */

export type ArenaLoadExposureProxyInventoryEntry = {
  /** Stable id for grep / future tests. */
  id: string;
  /** Prisma model or helper module name. */
  source: string;
  /** Column or logical field names referenced in code today. */
  fieldsUsed: readonly string[];
  /** What the metric is intended to mean in product language (honest). */
  semanticMeaning: string;
  /** Literal rule as implemented or derivable (plain text). */
  currentFormulaOrRule: string;
  /** What the signal intentionally includes. */
  included: string;
  /** What is out of scope / not read for this signal today. */
  excluded: string;
  /** Limits, misleading readings, or follow-up work — not product promises. */
  note: string;
};

export const ARENA_LOAD_EXPOSURE_PROXY_INVENTORY: readonly ArenaLoadExposureProxyInventoryEntry[] = [
  {
    id: "training_session_team_slots",
    source: "TrainingSession (Prisma)",
    fieldsUsed: ["teamId", "coachId", "startAt", "endAt", "status", "type", "subType", "arenaNextTrainingFocus"],
    semanticMeaning:
      "Planned CRM training slots for a team; duration proxy is scheduled interval startAt→endAt per row.",
    currentFormulaOrRule:
      "Per session: durationMs = endAt.getTime() - startAt.getTime() (not a persisted column; any aggregate would be a new query).",
    included: "All non-cancelled team sessions in a time window when filtered with status not \"cancelled\".",
    excluded:
      "Per-player attendance, live ice time, travel, recovery, off-ice load, other teams, cancelled sessions when status is exactly \"cancelled\".",
    note: "String `status` — domain values depend on writers; cancellation semantics are convention-based in queries.",
  },
  {
    id: "live_training_session_wall_clock",
    source: "LiveTrainingSession (Prisma)",
    fieldsUsed: ["startedAt", "endedAt", "confirmedAt", "status", "teamId", "coachId", "trainingSessionId"],
    semanticMeaning:
      "Coach live capture session lifecycle; wall-clock span of live is endedAt - startedAt when both timestamps exist.",
    currentFormulaOrRule:
      "Duration proxy only when endedAt != null: endedAt - startedAt. Not used inside evaluatePlayerLoad().",
    included: "Live/review/confirmed lifecycle timestamps tied to team + coach.",
    excluded:
      "Attendance per player, planned slot duration substitution, automatic linkage to every TrainingAttendance row.",
    note: "Link to CRM slot is optional via trainingSessionId; may be null for ad-hoc live.",
  },
  {
    id: "training_attendance_player_presence",
    source: "TrainingAttendance (Prisma)",
    fieldsUsed: ["trainingId", "playerId", "status", "createdAt"],
    semanticMeaning:
      "Declared presence/absence for a player on a scheduled TrainingSession (team roster event), not live-training row.",
    currentFormulaOrRule:
      "No aggregation in evaluatePlayerLoad(); presence not folded into weeklySessions.",
    included: "Per-player per-scheduled-session row when recorded.",
    excluded: "LiveTrainingSession participation, external training minutes, automatic roll-up into Arena load helper.",
    note: "Main semantic gap vs weeklySessions: team slot count ≠ player attended count until explicitly joined.",
  },
  {
    id: "external_training_report_volume",
    source: "ExternalTrainingReport (Prisma)",
    fieldsUsed: ["playerId", "coachId", "createdAt", "requestId"],
    semanticMeaning: "Count of persisted external-coach outcome reports for a player (Arena external contour).",
    currentFormulaOrRule:
      "recentExternalCount = count where playerId = :playerId AND createdAt >= now-7d. externalReportsLast2Days uses createdAt >= now-2d.",
    included: "Reports tied to playerId in rolling windows used by evaluatePlayerLoad().",
    excluded: "Request lifecycle only (see separate row), live signals, team schedule.",
    note: "Volume of reports ≠ training minutes; two reports in 48h triggers density branch in isHighLoad.",
  },
  {
    id: "external_training_request_state",
    source: "ExternalTrainingRequest (Prisma)",
    fieldsUsed: ["playerId", "parentId", "coachId", "status", "createdAt", "skillKey", "severity", "reasonSummary"],
    semanticMeaning: "Parent/coach initiated external training intent; state machine in string `status`.",
    currentFormulaOrRule: "Not counted in evaluatePlayerLoad() windows (reports-only for load heuristic today).",
    included: "Latest request flows in other Arena builders (e.g. follow-up recommendation path).",
    excluded: "weeklySessions / isHighLoad numeric inputs.",
    note: "Inventory only: requests carry intent load psychologically in UI but not in numeric load snapshot.",
  },
  {
    id: "evaluate_player_load_weekly_sessions",
    source: "evaluatePlayerLoad (src/lib/arena/build-external-follow-up-recommendation.ts)",
    fieldsUsed: ["Player.teamId → TrainingSession.count"],
    semanticMeaning:
      "weeklySessions: number of team TrainingSession rows for the player’s current team in rolling 7 days.",
    currentFormulaOrRule:
      "sevenDaysAgo = now - 7d; count TrainingSession where teamId = player.teamId AND status != \"cancelled\" AND startAt in [sevenDaysAgo, now]. If player.teamId null → 0.",
    included: "All scheduled team sessions in window (any group on that team calendar).",
    excluded:
      "TrainingAttendance filter, per-player minutes, LiveTrainingSession count, external requests, school-wide merges.",
    note: "Documented in helper JSDoc as «запланированные сессии команды» — not player exposure.",
  },
  {
    id: "evaluate_player_load_recent_external",
    source: "evaluatePlayerLoad (same file)",
    fieldsUsed: ["ExternalTrainingReport.playerId", "ExternalTrainingReport.createdAt"],
    semanticMeaning: "recentExternalCount — external reports for this player in last 7 days.",
    currentFormulaOrRule: "count reports where playerId = :id AND createdAt >= now - 7d.",
    included: "External contour density for defer/stop heuristics.",
    excluded: "Team schedule, live signals, request without report.",
    note: "Paired with externalReportsLast2Days for short-window stacking.",
  },
  {
    id: "evaluate_player_load_external_reports_last_2d",
    source: "evaluatePlayerLoad (same file)",
    fieldsUsed: ["ExternalTrainingReport.createdAt"],
    semanticMeaning: "externalReportsLast2Days — reports in last 48 hours (density signal).",
    currentFormulaOrRule: "twoDaysAgo = now - 2d; count reports where playerId = :id AND createdAt >= twoDaysAgo.",
    included: "Burst reporting detection.",
    excluded: "Anything outside ExternalTrainingReport rows.",
    note: "Feeds isHighLoad third disjunct (>=2 in 48h).",
  },
  {
    id: "evaluate_player_load_last_external_age",
    source: "evaluatePlayerLoad (same file)",
    fieldsUsed: ["ExternalTrainingReport.createdAt (latest row)"],
    semanticMeaning: "lastExternalAtDaysAgo — days since newest report (999 if none).",
    currentFormulaOrRule: "(now - latestExternal.createdAt) / MS_PER_DAY or 999.",
    included: "Recency of external contour for narrative elsewhere.",
    excluded: "Not part of isHighLoad boolean directly.",
    note: "Used by follow-up recommendation flow, not listed in isHighLoad disjunction.",
  },
  {
    id: "evaluate_player_load_is_high_load",
    source: "evaluatePlayerLoad (same file)",
    fieldsUsed: ["weeklySessions", "recentExternalCount", "externalReportsLast2Days"],
    semanticMeaning:
      "isHighLoad — deterministic OR of three proxies (team schedule density OR external report density).",
    currentFormulaOrRule:
      "isHighLoad = (weeklySessions >= 4) OR (recentExternalCount >= 2) OR (externalReportsLast2Days >= 2).",
    included: "Boolean used by external follow-up + parent development overview copy.",
    excluded: "Attendance, medical limits, sleep, travel, subjective coach slider.",
    note: "Product copy must not imply clinical overload; it is a conservative deferral heuristic.",
  },
  {
    id: "live_training_player_signal_strength",
    source: "LiveTrainingPlayerSignal (Prisma) + map-live-training-draft-to-analytics-signals",
    fieldsUsed: ["signalStrength", "metricDomain", "metricKey"],
    semanticMeaning:
      "Per confirmed observation-derived signal; strength defaults to 1 in CATEGORY_MAP mapping today.",
    currentFormulaOrRule: "Default signalStrength = 1 at materialize path for mapped drafts.",
    included: "Materialized analytics slice per draft.",
    excluded: "Volume ontology across sessions, minutes on ice, HR.",
    note: "Not used by evaluatePlayerLoad(); weak proxy if ever reused for «intensity» without new model.",
  },
] as const;

/** Product-facing builders that already consume `PlayerLoadSnapshot` / load heuristics (inventory only). */
export const ARENA_LOAD_EXPOSURE_PRODUCT_COPY_DEPENDENCIES: readonly {
  path: string;
  uses: readonly string[];
}[] = [
  {
    path: "src/lib/arena/build-player-development-overview.ts",
    uses: ["evaluatePlayerLoad → weeklySessions", "evaluatePlayerLoad → isHighLoad", "phase + external context"],
  },
  {
    path: "src/lib/arena/build-external-follow-up-recommendation.ts",
    uses: [
      "evaluatePlayerLoad",
      "deferDueToLoadView(load) — strings tied to weeklySessions / recentExternalCount / externalReportsLast2Days",
    ],
  },
] as const;

/** Loader boundaries that affect how much «load context» enters supercore (read-model gap, not Prisma gap). */
export const ARENA_LOAD_EXPOSURE_LOADER_LIMITS: readonly {
  path: string;
  note: string;
}[] = [
  {
    path: "src/lib/arena/supercore/load-arena-core-facts.ts",
    note: "v1 explicitly does not pull external training HTTP read models; optional drafts enrichment is gated — supercore is not full exposure/load SSOT.",
  },
] as const;

/**
 * INTERNAL REFERENCE ONLY — not wired into production builders, UI, or APIs.
 *
 * Inventory of parent-facing Arena data semantics as implemented in repo (read-only audit artifact).
 * Paths are documentation strings; keep in sync when behavior changes.
 */

/** Minimal vocabulary confirmed by code paths (parent Arena + adjacent server builders). */
export type ArenaParentSourceKind =
  | "published_training_report"
  | "live_session_fallback_packet"
  | "live_session_text_fields"
  | "arena_live_draft_derived"
  | "trainer_session_evaluation"
  | "trainer_session_report_text"
  | "profile_story_trend"
  | "evaluation_aggregate_summary"
  | "attendance_aggregate_proxy"
  | "team_schedule_session_proxy"
  | "coach_recommendations_list"
  | "ai_analysis_profile"
  | "external_training_request"
  | "external_training_report"
  | "development_phase_heuristic"
  | "continuity_snapshot"
  | "mixed_multi_source_heuristic";

export type SourceNature = "raw" | "derived" | "proxy" | "mixed";

/** How clearly the product surface exposes lineage to parents today (not a target state). */
export type UserAttributionVisibility =
  | "clear"
  | "partial"
  | "blurred"
  | "unknown_to_user";

export type ArenaParentSourceRegistryRow = {
  /** Stable id for diffs / search */
  id: string;
  /** What this row describes */
  outputFamily: string;
  /** Primary implementation locations (repo-relative) */
  primaryCodeRefs: readonly string[];
  /** Dominant inputs for this output; order not priority */
  dominantSourceKinds: readonly ArenaParentSourceKind[];
  sourceNature: SourceNature;
  userVisibility: UserAttributionVisibility;
  trustNote?: string;
  recommendedBoundary?: string;
};

/**
 * One row per inspected surface / builder family.
 * Overlaps are intentional: same kind can feed multiple surfaces (e.g. live text + Arena draft layer).
 */
export const ARENA_PARENT_SOURCE_SEMANTICS_REGISTRY = [
  {
    id: "live_training_dto_packet",
    outputFamily: "ParentLatestLiveTrainingSummaryDto (hasData)",
    primaryCodeRefs: [
      "src/lib/live-training/parent-latest-live-training-summary.ts",
      "parent-app/types/parentLatestLiveTrainingSummary.ts",
    ],
    dominantSourceKinds: [
      "published_training_report",
      "live_session_fallback_packet",
      "live_session_text_fields",
      "arena_live_draft_derived",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "partial",
    trustNote:
      "DTO.source discriminates published vs live_session_fallback; arenaSummary/Guidance are draft-derived on top of resolved live session.",
    recommendedBoundary:
      "Treat packet source vs arena_live_draft_derived separately if UI needs finer lineage than one provenance line.",
  },
  {
    id: "live_training_hero_ui",
    outputFamily: "ParentLiveTrainingHeroBlock + hero payload",
    primaryCodeRefs: [
      "parent-app/components/live-training/ParentLiveTrainingHeroBlock.tsx",
      "parent-app/types/parentLatestLiveTrainingSummary.ts",
    ],
    dominantSourceKinds: [
      "arena_live_draft_derived",
      "live_session_text_fields",
      "published_training_report",
      "live_session_fallback_packet",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "partial",
    trustNote:
      "Headline/body from ArenaParentSummary/Guidance or shortSummary fallback; provenanceLine maps DTO.source when content exists.",
  },
  {
    id: "arena_parent_summary_guidance_types",
    outputFamily: "ArenaParentSummary / ArenaParentGuidance wire shapes",
    primaryCodeRefs: [
      "parent-app/types/arenaParentSummary.ts",
      "parent-app/types/arenaParentGuidance.ts",
    ],
    dominantSourceKinds: ["arena_live_draft_derived"] as const,
    sourceNature: "derived",
    userVisibility: "unknown_to_user",
    trustNote: "Types are transport-only; lineage is established where objects are built (server live draft pipeline).",
  },
  {
    id: "weekly_insight",
    outputFamily: "deriveArenaWeeklyInsight + follow-ups",
    primaryCodeRefs: ["parent-app/lib/arenaWeeklyInsight.ts"],
    dominantSourceKinds: [
      "trainer_session_evaluation",
      "trainer_session_report_text",
      "live_session_text_fields",
      "profile_story_trend",
      "evaluation_aggregate_summary",
      "attendance_aggregate_proxy",
      "coach_recommendations_list",
      "ai_analysis_profile",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "partial",
    trustNote:
      "Strict priority stack; each bucket leans on one ctx slice but parent sees merged card without per-field chips.",
  },
  {
    id: "today_focus",
    outputFamily: "deriveArenaTodayFocus",
    primaryCodeRefs: ["parent-app/lib/arenaTodayFocus.ts"],
    dominantSourceKinds: [
      "trainer_session_evaluation",
      "ai_analysis_profile",
      "live_session_text_fields",
      "trainer_session_report_text",
      "coach_recommendations_list",
      "mixed_multi_source_heuristic",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "partial",
    trustNote:
      "Payload includes `sourceLine` per winning branch (eval / AI growth / live df / report fa+summary / coach rec / eval note / default); UI must render when wiring today surface.",
  },
  {
    id: "weekly_summary",
    outputFamily: "deriveArenaWeeklySummary",
    primaryCodeRefs: ["parent-app/lib/arenaWeeklySummary.ts"],
    dominantSourceKinds: [
      "live_session_text_fields",
      "trainer_session_report_text",
      "ai_analysis_profile",
      "trainer_session_evaluation",
      "attendance_aggregate_proxy",
      "profile_story_trend",
      "coach_recommendations_list",
      "mixed_multi_source_heuristic",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "blurred",
    trustNote:
      "pickPositive / pickAttention / pickNextStep each pull first match from overlapping pools — classify as mixed_multi_source_heuristic at card level.",
    recommendedBoundary: "Any future attribution should be per-field, not one card-level label.",
  },
  {
    id: "proactive_nudge",
    outputFamily: "deriveArenaProactiveNudge",
    primaryCodeRefs: ["parent-app/lib/arenaProactiveNudge.ts"],
    dominantSourceKinds: [
      "trainer_session_evaluation",
      "live_session_text_fields",
      "trainer_session_report_text",
      "attendance_aggregate_proxy",
      "evaluation_aggregate_summary",
      "profile_story_trend",
      "continuity_snapshot",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "partial",
    trustNote:
      "Prompts often say «по данным контекста»; attendance branch is aggregate proxy — easy to read as child truth without extra UI.",
  },
  {
    id: "player_development_overview",
    outputFamily: "buildPlayerDevelopmentOverview",
    primaryCodeRefs: [
      "src/lib/arena/build-player-development-overview.ts",
      "src/lib/arena/build-player-development-phase.ts",
    ],
    dominantSourceKinds: [
      "development_phase_heuristic",
      "external_training_request",
      "external_training_report",
      "team_schedule_session_proxy",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "partial",
    trustNote:
      "Phase + external contour + evaluatePlayerLoad (team calendar sessions, external report counts); wording slice reduced proxy-as-truth risk.",
  },
  {
    id: "external_follow_up_recommendation",
    outputFamily: "buildExternalFollowUpRecommendation (+ evaluatePlayerLoad)",
    primaryCodeRefs: ["src/lib/arena/build-external-follow-up-recommendation.ts"],
    dominantSourceKinds: [
      "external_training_request",
      "external_training_report",
      "team_schedule_session_proxy",
    ] as const,
    sourceNature: "mixed",
    userVisibility: "partial",
    trustNote:
      "defer_due_to_load uses PlayerLoadSnapshot; other branches use report text / stop heuristics; sourceNote strings document basis for defer.",
  },
  {
    id: "arena_summary_surface",
    outputFamily: "ArenaSummarySurfaceView (GET /api/arena/summary-surface)",
    primaryCodeRefs: [
      "parent-app/services/arenaExternalTrainingService.ts",
      "parent-app/components/player/PlayerArenaSummarySurfaceBlock.tsx",
    ],
    dominantSourceKinds: ["external_training_request", "external_training_report"] as const,
    sourceNature: "derived",
    userVisibility: "partial",
    trustNote:
      "PlayerArenaSummarySurfaceBlock shows boundary line above «Сейчас»; home entry uses title + brand kicker.",
  },
  {
    id: "arena_summary_presentation",
    outputFamily: "arenaSummaryPresentation (tokens, clamps)",
    primaryCodeRefs: ["parent-app/lib/arenaSummaryPresentation.ts"],
    dominantSourceKinds: [] as const,
    sourceNature: "derived",
    userVisibility: "unknown_to_user",
    trustNote: "No semantic data lineage — presentation + brand kicker constants for surfaces that consume server strings.",
    recommendedBoundary: "Do not treat as a data source; changes here do not change facts.",
  },
] as const satisfies readonly ArenaParentSourceRegistryRow[];

export type ArenaParentSourceRegistryRowFromConst = (typeof ARENA_PARENT_SOURCE_SEMANTICS_REGISTRY)[number];

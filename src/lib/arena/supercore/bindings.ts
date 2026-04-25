/**
 * Arena Supercore — binding layer (v1): links `ArenaCoreFacts` to interpretation / decision / explanation records.
 * No persistence; no second action system — typed contracts for downstream route adoption.
 *
 * Provenance: see `docs/architecture/ARENA_SUPERCORE_SSOT.md` §10.
 */

/**
 * Explicit pointer to a fact slice. `tier` must match the underlying fact in `ArenaCoreFacts`.
 * Do not label `derived` refs as `canonical` or vice versa.
 */
export type ArenaFactRef =
  | { tier: "canonical"; kind: "live_training_session"; liveTrainingSessionId: string }
  | { tier: "canonical"; kind: "report_draft"; liveTrainingSessionId: string; draftId: string }
  | { tier: "canonical"; kind: "linked_training_session"; trainingSessionId: string }
  | {
      tier: "canonical";
      kind: "published_training_session_report";
      trainingSessionId: string;
      reportId: string;
    }
  | { tier: "canonical"; kind: "arena_next_focus_column"; liveTrainingSessionId: string }
  | { tier: "derived"; kind: "parsed_session_meaning"; liveTrainingSessionId: string }
  | { tier: "derived"; kind: "live_training_analytics_summary"; liveTrainingSessionId: string };

/** Aggregated themes/focus/team lines from persisted `sessionMeaningJson` (deterministic builder output). */
export type ArenaInterpretationRecord = {
  id: string;
  kind: "session_meaning_theme" | "session_meaning_focus" | "session_meaning_team_line";
  /** Short label (theme key, focus label, or truncated line). */
  label: string;
  /** Optional numeric weight from SessionMeaning. */
  weight?: number;
  /** Always derived: built from parsed SessionMeaning, not raw Prisma row text. */
  supportedByTier: "derived";
  factRefs: readonly ArenaFactRef[];
};

/** Action / focus / trigger lines bound to explicit facts (no new execution engine). */
export type ArenaDecisionRecord = {
  id: string;
  kind:
    | "arena_next_focus_column"
    | "session_meaning_next_training_focus"
    | "session_meaning_team_next_action"
    | "session_meaning_player_next_action"
    | "session_meaning_action_trigger";
  text: string;
  supportedByTier: "canonical" | "derived";
  factRefs: readonly ArenaFactRef[];
  playerId?: string;
  /** Optional cross-links to interpretation ids (same session). */
  relatedInterpretationIds?: readonly string[];
};

/** Human-readable explainability; text must be template-backed here, not LLM. */
export type ArenaExplanationRecord = {
  id: string;
  kind:
    | "session_meaning_confidence_profile"
    | "analytics_counts_profile"
    | "published_report_presence"
    | "report_draft_state";
  audience: "parent" | "coach" | "internal";
  text: string;
  supportedByTier: "canonical" | "derived";
  factRefs: readonly ArenaFactRef[];
};

export type ArenaCoreBindings = {
  version: "1";
  interpretations: ArenaInterpretationRecord[];
  decisions: ArenaDecisionRecord[];
  explanations: ArenaExplanationRecord[];
  /** What was skipped or capped in v1 (honest limits). */
  notes: string[];
};

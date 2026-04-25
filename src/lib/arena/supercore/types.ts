/**
 * Arena Supercore — read-only aggregate contract (v1).
 * No new DB tables; consumers use this as a typed view over existing canonical inputs.
 */

import type { LiveTrainingMode, LiveTrainingSessionStatus } from "@prisma/client";
import type { LiveTrainingSessionAnalyticsSummary } from "@/lib/live-training/live-training-player-signals";
import type { LiveTrainingPlanningSnapshotDto } from "@/lib/live-training/live-training-planning-snapshot";
import type { SessionMeaning } from "@/lib/live-training/session-meaning";

/** How a field is classified relative to SSOT (see docs/architecture/ARENA_SUPERCORE_SSOT.md). */
export type ArenaCoreFactTier = "canonical" | "derived" | "heuristic";

/**
 * v1 scope: one live training session. Other scopes (player-only, team-only) are future passes.
 */
export type ArenaCoreFactsScope = {
  liveTrainingSessionId: string;
};

/** Persisted row subset + relation counts — all from Prisma / official columns. */
export type ArenaCoreCanonicalFacts = {
  tier: "canonical";
  liveTrainingSessionId: string;
  coachId: string;
  teamId: string;
  teamName: string | null;
  mode: LiveTrainingMode;
  status: LiveTrainingSessionStatus;
  trainingSessionIdColumn: string | null;
  /** Resolved slot id: column or `planningSnapshotJson.scheduleSlotContext.trainingSlotId`. */
  linkedTrainingSessionId: string | null;
  startedAt: string;
  endedAt: string | null;
  confirmedAt: string | null;
  arenaNextFocusLine: string | null;
  arenaNextFocusAppliedAt: string | null;
  arenaNextFocusTargetTrainingSessionId: string | null;
  counts: {
    liveTrainingEvents: number;
    liveTrainingPlayerSignals: number;
    liveTrainingObservationDraftsActive: number;
  };
  reportDraft: null | {
    id: string;
    status: string;
    publishedAt: string | null;
  };
  /** Presence of published `TrainingSessionReport` for the linked CRM slot, if any. */
  publishedTrainingSessionReport: null | {
    trainingSessionId: string;
    reportId: string;
    hasPublishedText: boolean;
  };
};

/** Deterministic transforms of canonical JSON / aggregates (no LLM). */
export type ArenaCoreDerivedFacts = {
  tier: "derived";
  sessionMeaning: SessionMeaning | null;
  planningSnapshot: LiveTrainingPlanningSnapshotDto | null;
  analyticsSummary: LiveTrainingSessionAnalyticsSummary;
};

/** Explicitly not populated in v1 (external contour, parent mixed summary, AI). */
export type ArenaCoreExcludedV1 = {
  externalTrainingContour: true;
  parentMixedReadModels: true;
  loadEnrichedLiveTrainingDraftsForSession: true;
};

export type ArenaCoreFactsMeta = {
  /** Contract version for downstream migrations. */
  version: "1";
  /** Human-readable notes for engineers (e.g. what v1 skips). */
  notes: string[];
  excluded: ArenaCoreExcludedV1;
};

export type ArenaCoreFacts = {
  meta: ArenaCoreFactsMeta;
  canonical: ArenaCoreCanonicalFacts;
  derived: ArenaCoreDerivedFacts;
};

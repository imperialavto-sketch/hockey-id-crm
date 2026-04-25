/**
 * Live Training — серверный API (PHASE 2). In-memory слой снят.
 *
 * ARCHITECTURE FREEZE: SSOT — coach-app → `/api/live-training/sessions` (`LiveTrainingSession`). See docs/ARCHITECTURE_FREEZE_PHASE_0.md
 *
 * PHASE 6: canonical **coach live Arena** runtime. ≠ training slot voice-draft; ≠ parent `/api/arena/*`; ≠ marketplace.
 *
 * PHASE 1: `LIVE_TRAINING_SSOT` — `docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md` (`LiveTrainingSession`, не `CoachSession`).
 * PHASE 2: HTTP family `CANONICAL_LIVE_TRAINING_API` — `docs/PHASE_2_API_ROUTE_LOCK.md`, repo `src/lib/architecture/apiContours.ts`.
 * PHASE 3: `COACH_CANONICAL_LIVE_FLOW` — `docs/PHASE_3_APP_FLOW_LOCK.md`, `appFlowContours.ts`. Do not route arena UI through `coachSessionLiveService` (`DO_NOT_BIND_TO_LEGACY_FLOW`).
 * PHASE 4: only allowed live product client vs `FROZEN_COACH_SESSION_SURFACE` — `docs/PHASE_4_DEAD_PATH_ISOLATION.md`, `isolationContours.ts`.
 */

import { apiFetch, ApiRequestError, isApi409 } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";
import { createClientMutationId } from "@/lib/liveTrainingClientMutationId";
import { parseLiveTrainingSessionMeaningFromApi } from "@/lib/liveTrainingSessionMeaningParse";
import { buildParentProgressHeadlineRu } from "@shared/live-training/parent-progress-headline-ru";
import type {
  LiveTrainingArenaCoachDecision,
  LiveTrainingArenaCoachReviewCategory,
  LiveTrainingArenaCoachReviewPriority,
  LiveTrainingArenaObservationInterpretation,
  LiveTrainingConfirmAnalytics,
  LiveTrainingConfirmResult,
  LiveTrainingDraftCorrectionSuggestion,
  LiveTrainingDraftProvenance,
  LiveTrainingGuidanceCuesPayload,
  LiveTrainingMode,
  LiveTrainingObservationDraft,
  LiveTrainingPlanningSnapshot,
  LiveTrainingPreConfirmSummary,
  LiveTrainingReportDraftEvidenceItem,
  LiveTrainingReportDraftNoteItem,
  LiveTrainingReportDraftPlayerSummary,
  LiveTrainingReviewRosterEntry,
  LiveTrainingReviewState,
  LiveTrainingReviewSummary,
  LiveTrainingSession,
  LiveTrainingContinuitySnapshot,
  LiveTrainingPriorityAlignmentReview,
  LiveTrainingQualityFrame,
  LiveTrainingSessionOutcome,
  LiveTrainingSessionOutcomePlayer,
  LiveTrainingReportAudienceViews,
  LiveTrainingReportDraftNarrativePatchBody,
  LiveTrainingReportDraftPayload,
  LiveTrainingReportDraftPublishResult,
  LiveTrainingPublishedFinalReportRead,
  LiveTrainingPublishedReportInfo,
  LiveTrainingCoachPreviewNarrativeMetaV1,
  LiveTrainingCoachPreviewNarrativeV1,
  LiveTrainingSessionMeaningNextActionsV1,
  LiveTrainingSessionMeaningParentActionRowV1,
  LiveTrainingSessionMeaningProgressV1,
  LiveTrainingSessionMeaningActionTriggerV1,
  LiveTrainingSessionMeaningSuggestedActionsV1,
  LiveTrainingSessionMeaningSuggestedCoachV1,
  LiveTrainingSessionMeaningSuggestedRecommendedCoachV1,
  LiveTrainingSessionMeaningSuggestedParentV1,
  LiveTrainingSessionReportDraft,
  LiveTrainingSessionReportDraftSummary,
  LiveTrainingSentiment,
  LiveTrainingExternalWorkImpactRowV1,
} from "@/types/liveTraining";

const BASE = "/api/live-training/sessions";

/** True for timeouts, network-layer failures (status 0), rate limits, and 5xx — safe to retry. */
export function isLiveTrainingTransientApiError(e: unknown): boolean {
  if (!(e instanceof ApiRequestError)) return false;
  const s = e.status;
  if (s === 0 || s === 408 || s === 429) return true;
  if (s >= 500 && s < 600) return true;
  return false;
}

export async function withLiveTrainingTransientRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isLiveTrainingTransientApiError(e) || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

type ApiOutcomeRow = {
  includedDraftsCount?: number;
  excludedDraftsCount?: number;
  draftsFlaggedNeedsReview?: number;
  manualAttentionDraftsCount?: number;
  playerObservationCount?: number;
  playerLinkedObservationCount?: number;
  playerObservationUnlinkedCount?: number;
  teamObservationCount?: number;
  sessionObservationCount?: number;
  signalsCreatedCount?: number;
  affectedPlayersCount?: number;
  positiveSignalsCount?: number;
  negativeSignalsCount?: number;
  neutralSignalsCount?: number;
  topDomains?: string[];
  topPlayers?: Array<{
    playerId?: string;
    playerName?: string;
    totalSignals?: number;
    positiveCount?: number;
    negativeCount?: number;
    neutralCount?: number;
    topDomains?: string[];
  }>;
};

type ApiSessionRow = {
  id: string;
  teamId: string;
  teamName: string;
  mode: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  confirmedAt?: string | null;
  trainingSessionId?: string | null;
  planningSnapshot?: LiveTrainingPlanningSnapshot;
  guidanceCues?: LiveTrainingGuidanceCuesPayload;
  analyticsSummary?: {
    signalCount: number;
    playersWithSignals: number;
    draftsWithPlayerCount: number;
  } | null;
  outcome?: ApiOutcomeRow | null;
  continuitySnapshot?: unknown;
  autoFinalized?: boolean;
  sessionMeaningJson?: unknown;
};

type ApiDraftProvenanceRow = {
  contextUsed?: unknown;
  contextAdjustedPlayerMatch?: unknown;
  contextAdjustedCategory?: unknown;
  contextAdjustedSentiment?: unknown;
  parserConfidenceBeforeContext?: unknown;
  parserConfidenceAfterContext?: unknown;
  contextSignals?: unknown;
  contextSuggestionPlayerId?: unknown;
  contextSuggestionPlayerName?: unknown;
  contextSuggestionCategory?: unknown;
  contextSuggestionSentiment?: unknown;
  blockContextUsed?: unknown;
  blockContextSignals?: unknown;
  contextAdjustedPlayerMatchSource?: unknown;
  contextAdjustedCategorySource?: unknown;
  contextAdjustedSentimentSource?: unknown;
  startPriorityUsed?: unknown;
  startPrioritySignals?: unknown;
  startPriorityPlayerHit?: unknown;
  startPriorityDomainHit?: unknown;
  startPriorityReinforcementHit?: unknown;
};

type ApiDraftCorrectionSuggestionRow = {
  id?: unknown;
  suggestionType?: unknown;
  label?: unknown;
  value?: unknown;
  tone?: unknown;
  patch?: unknown;
  sourceLayer?: unknown;
  suggestionPriority?: unknown;
  suggestionConfidence?: unknown;
};

type ApiDraftRow = {
  id: string;
  sessionId: string;
  playerId: string | null;
  playerNameRaw: string | null;
  sourceText: string;
  category: string;
  sentiment: string;
  confidence: number | null;
  needsReview: boolean;
  provenance?: ApiDraftProvenanceRow | null;
  correctionSuggestions?: ApiDraftCorrectionSuggestionRow[] | null;
  interpretation?: unknown;
  coachDecision?: unknown;
};

const ARENA_COACH_REVIEW_CATEGORIES = new Set<LiveTrainingArenaCoachReviewCategory>([
  "clarification",
  "mistake",
  "behavior",
  "success",
  "neutral",
  "unclear",
]);

const ARENA_COACH_REVIEW_PRIORITIES = new Set<LiveTrainingArenaCoachReviewPriority>([
  "high",
  "medium",
  "low",
]);

const ARENA_INTERP_SIGNALS = new Set<LiveTrainingArenaObservationInterpretation["signalKind"]>([
  "success",
  "mistake",
  "neutral_observation",
]);

const ARENA_INTERP_DOMAINS = new Set<LiveTrainingArenaObservationInterpretation["domain"]>([
  "technical",
  "tactical",
  "physical",
  "behavioral",
  "unclear",
]);

const ARENA_INTERP_DIRECTIONS = new Set<LiveTrainingArenaObservationInterpretation["direction"]>([
  "positive",
  "negative",
  "neutral",
]);

const ARENA_INTERP_CONFIDENCES = new Set<LiveTrainingArenaObservationInterpretation["confidence"]>([
  "high",
  "medium",
  "low",
]);

function mapArenaInterpretation(
  raw: unknown
): LiveTrainingArenaObservationInterpretation | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const sk = o.signalKind;
  const dom = o.domain;
  const dir = o.direction;
  const conf = o.confidence;
  const nr = o.needsReview;
  if (
    typeof sk !== "string" ||
    !ARENA_INTERP_SIGNALS.has(sk as LiveTrainingArenaObservationInterpretation["signalKind"]) ||
    typeof dom !== "string" ||
    !ARENA_INTERP_DOMAINS.has(dom as LiveTrainingArenaObservationInterpretation["domain"]) ||
    typeof dir !== "string" ||
    !ARENA_INTERP_DIRECTIONS.has(dir as LiveTrainingArenaObservationInterpretation["direction"]) ||
    typeof conf !== "string" ||
    !ARENA_INTERP_CONFIDENCES.has(conf as LiveTrainingArenaObservationInterpretation["confidence"]) ||
    typeof nr !== "boolean"
  ) {
    return undefined;
  }
  const rationale =
    typeof o.rationale === "string" && o.rationale.trim() ? o.rationale.trim() : undefined;
  const row: LiveTrainingArenaObservationInterpretation = {
    signalKind: sk as LiveTrainingArenaObservationInterpretation["signalKind"],
    domain: dom as LiveTrainingArenaObservationInterpretation["domain"],
    direction: dir as LiveTrainingArenaObservationInterpretation["direction"],
    confidence: conf as LiveTrainingArenaObservationInterpretation["confidence"],
    needsReview: nr,
  };
  if (rationale) row.rationale = rationale;
  return row;
}

function mapArenaCoachDecision(raw: unknown): LiveTrainingArenaCoachDecision | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.requiresCoachReview !== "boolean") return undefined;
  const cat = o.reviewCategory;
  const pri = o.reviewPriority;
  if (
    typeof cat !== "string" ||
    !ARENA_COACH_REVIEW_CATEGORIES.has(cat as LiveTrainingArenaCoachReviewCategory) ||
    typeof pri !== "string" ||
    !ARENA_COACH_REVIEW_PRIORITIES.has(pri as LiveTrainingArenaCoachReviewPriority)
  ) {
    return undefined;
  }
  const reasonsRaw = o.coachAttentionReasons;
  const coachAttentionReasons = Array.isArray(reasonsRaw)
    ? reasonsRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const out: LiveTrainingArenaCoachDecision = {
    requiresCoachReview: o.requiresCoachReview,
    reviewCategory: cat as LiveTrainingArenaCoachReviewCategory,
    reviewPriority: pri as LiveTrainingArenaCoachReviewPriority,
    coachAttentionReasons,
  };
  if (o.repeatedConcernInSession === true) out.repeatedConcernInSession = true;
  return out;
}

function mapOutcomePlayer(row: NonNullable<ApiOutcomeRow["topPlayers"]>[number]): LiveTrainingSessionOutcomePlayer {
  return {
    playerId: String(row.playerId ?? ""),
    playerName: String(row.playerName ?? "Игрок"),
    totalSignals: Number(row.totalSignals ?? 0),
    positiveCount: Number(row.positiveCount ?? 0),
    negativeCount: Number(row.negativeCount ?? 0),
    neutralCount: Number(row.neutralCount ?? 0),
    topDomains: Array.isArray(row.topDomains) ? row.topDomains.map(String) : [],
  };
}

function mapPriorityAlignmentReview(raw: unknown): LiveTrainingPriorityAlignmentReview | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const score = o.alignmentScore;
  const band = o.alignmentBand;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (
    band !== "strong" &&
    band !== "partial" &&
    band !== "weak" &&
    band !== "not_applicable"
  ) {
    return null;
  }
  const explanation = Array.isArray(o.explanation)
    ? o.explanation.filter((x): x is string => typeof x === "string")
    : [];
  const computedAt = typeof o.computedAt === "string" ? o.computedAt : "";
  return {
    alignmentScore: score,
    alignmentBand: band,
    playerCoverage: Array.isArray(o.playerCoverage)
      ? o.playerCoverage
          .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
          .map((row) => ({
            playerId: String(row.playerId ?? ""),
            playerName: String(row.playerName ?? "Игрок"),
            covered: Boolean(row.covered),
          }))
      : [],
    domainCoverage: Array.isArray(o.domainCoverage)
      ? o.domainCoverage
          .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
          .map((row) => ({
            domain: String(row.domain ?? ""),
            covered: Boolean(row.covered),
          }))
      : [],
    reinforcementCoverage: Array.isArray(o.reinforcementCoverage)
      ? o.reinforcementCoverage
          .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
          .map((row) => ({
            domain: String(row.domain ?? ""),
            covered: Boolean(row.covered),
          }))
      : [],
    uncoveredPlayers: Array.isArray(o.uncoveredPlayers)
      ? o.uncoveredPlayers.filter((x): x is string => typeof x === "string")
      : [],
    uncoveredDomains: Array.isArray(o.uncoveredDomains)
      ? o.uncoveredDomains.filter((x): x is string => typeof x === "string")
      : [],
    uncoveredReinforcement: Array.isArray(o.uncoveredReinforcement)
      ? o.uncoveredReinforcement.filter((x): x is string => typeof x === "string")
      : [],
    explanation,
    computedAt,
    skippedNoTargets: o.skippedNoTargets === true,
    evaluationApplied:
      typeof o.evaluationApplied === "boolean"
        ? o.evaluationApplied
        : o.skippedNoTargets !== true,
  };
}

function mapTrainingQualityFrame(raw: unknown): LiveTrainingQualityFrame | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const qb = o.qualityBand;
  if (
    qb != null &&
    qb !== "stable" &&
    qb !== "watch" &&
    qb !== "recovery"
  ) {
    return null;
  }
  const qualityBand: LiveTrainingQualityFrame["qualityBand"] =
    qb === "stable" || qb === "watch" || qb === "recovery" ? qb : null;
  const ab = o.alignmentBand;
  if (
    ab !== "strong" &&
    ab !== "partial" &&
    ab !== "weak" &&
    ab !== "not_applicable"
  ) {
    return null;
  }
  const ep = o.executionPressureMode;
  if (ep !== "normal" && ep !== "watch" && ep !== "tighten") return null;
  const u = o.unresolvedPriorityCount;
  const r = o.repeatedGapSignalCount;
  if (typeof u !== "number" || !Number.isFinite(u)) return null;
  if (typeof r !== "number" || !Number.isFinite(r)) return null;
  const explanation = Array.isArray(o.explanation)
    ? o.explanation.filter((x): x is string => typeof x === "string")
    : [];
  const computedAt = typeof o.computedAt === "string" ? o.computedAt : "";
  const evaluationApplied =
    typeof o.evaluationApplied === "boolean" ? o.evaluationApplied : false;
  return {
    qualityBand,
    alignmentBand: ab,
    executionPressureMode: ep,
    unresolvedPriorityCount: u,
    repeatedGapSignalCount: r,
    explanation,
    computedAt,
    evaluationApplied,
  };
}

function mapContinuitySnapshot(raw: unknown): LiveTrainingContinuitySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (typeof o.generatedAt !== "string" || typeof o.teamId !== "string") return null;
  if (!Array.isArray(o.summaryLines)) return null;
  if (!Array.isArray(o.carriedFocusPlayers) || !Array.isArray(o.carriedDomains)) return null;
  const base: LiveTrainingContinuitySnapshot = {
    version: 1,
    generatedAt: o.generatedAt,
    teamId: o.teamId,
    carriedFocusPlayers: o.carriedFocusPlayers as LiveTrainingContinuitySnapshot["carriedFocusPlayers"],
    carriedDomains: o.carriedDomains as LiveTrainingContinuitySnapshot["carriedDomains"],
    carriedReinforceAreas: Array.isArray(o.carriedReinforceAreas)
      ? (o.carriedReinforceAreas as LiveTrainingContinuitySnapshot["carriedReinforceAreas"])
      : [],
    summaryLines: o.summaryLines.filter((x): x is string => typeof x === "string"),
  };
  const par = mapPriorityAlignmentReview(o.priorityAlignmentReview);
  if (par) base.priorityAlignmentReview = par;
  const tqf = mapTrainingQualityFrame(o.trainingQualityFrame);
  if (tqf) base.trainingQualityFrame = tqf;
  return base;
}

function mapOutcome(row: ApiOutcomeRow | null | undefined): LiveTrainingSessionOutcome | null {
  if (!row || typeof row !== "object") return null;
  const included = Number(row.includedDraftsCount ?? 0);
  const playerObs = Number(row.playerObservationCount ?? 0);
  const teamObs = Number(row.teamObservationCount ?? 0);
  const sessionObs = Number(row.sessionObservationCount ?? 0);
  const resolvedPlayerObs =
    row.playerObservationCount !== undefined
      ? playerObs
      : Math.max(0, included - teamObs - sessionObs);
  const linkedFromApi =
    row.playerLinkedObservationCount !== undefined
      ? Number(row.playerLinkedObservationCount)
      : resolvedPlayerObs;
  const unlinkedFromApi =
    row.playerObservationUnlinkedCount !== undefined
      ? Number(row.playerObservationUnlinkedCount)
      : Math.max(0, resolvedPlayerObs - linkedFromApi);
  const needsReviewCount = Number(row.draftsFlaggedNeedsReview ?? 0);
  const manualAttentionDraftsCount =
    row.manualAttentionDraftsCount !== undefined
      ? Number(row.manualAttentionDraftsCount)
      : needsReviewCount + unlinkedFromApi;
  return {
    includedDraftsCount: included,
    excludedDraftsCount: Number(row.excludedDraftsCount ?? 0),
    draftsFlaggedNeedsReview: needsReviewCount,
    manualAttentionDraftsCount,
    playerObservationCount: resolvedPlayerObs,
    playerLinkedObservationCount: linkedFromApi,
    playerObservationUnlinkedCount: unlinkedFromApi,
    teamObservationCount: teamObs,
    sessionObservationCount: sessionObs,
    signalsCreatedCount: Number(row.signalsCreatedCount ?? 0),
    affectedPlayersCount: Number(row.affectedPlayersCount ?? 0),
    positiveSignalsCount: Number(row.positiveSignalsCount ?? 0),
    negativeSignalsCount: Number(row.negativeSignalsCount ?? 0),
    neutralSignalsCount: Number(row.neutralSignalsCount ?? 0),
    topDomains: Array.isArray(row.topDomains) ? row.topDomains.map(String) : [],
    topPlayers: Array.isArray(row.topPlayers) ? row.topPlayers.map(mapOutcomePlayer) : [],
  };
}

function mapSession(row: ApiSessionRow): LiveTrainingSession {
  const s: LiveTrainingSession = {
    id: row.id,
    teamId: row.teamId,
    teamName: row.teamName,
    mode: row.mode as LiveTrainingMode,
    startedAt: row.startedAt,
    endedAt: row.endedAt ?? null,
    status: row.status as LiveTrainingSession["status"],
  };
  if (typeof row.trainingSessionId === "string" && row.trainingSessionId.trim()) {
    s.trainingSessionId = row.trainingSessionId.trim();
  } else if (row.trainingSessionId === null) {
    s.trainingSessionId = null;
  }
  if (row.planningSnapshot && typeof row.planningSnapshot === "object") {
    s.planningSnapshot = row.planningSnapshot;
  }
  if (row.guidanceCues?.cues?.length) {
    s.guidanceCues = row.guidanceCues;
  }
  if (row.analyticsSummary != null) {
    s.analyticsSummary = row.analyticsSummary;
  }
  const outcome = mapOutcome(row.outcome);
  if (outcome) {
    s.outcome = outcome;
  }
  const continuity = mapContinuitySnapshot(row.continuitySnapshot);
  if (continuity) {
    s.continuitySnapshot = continuity;
  }
  if (row.autoFinalized === true) {
    s.autoFinalized = true;
  }
  const meaning = parseLiveTrainingSessionMeaningFromApi(row.sessionMeaningJson);
  if (meaning) {
    s.sessionMeaningJson = meaning;
  }
  return s;
}

const LIVE_TRAINING_SENTIMENTS: LiveTrainingSentiment[] = ["positive", "negative", "neutral"];

function parseLiveTrainingSentiment(v: unknown): LiveTrainingSentiment | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim() as LiveTrainingSentiment;
  return LIVE_TRAINING_SENTIMENTS.includes(s) ? s : undefined;
}

function mapDraftProvenance(row: ApiDraftProvenanceRow | null | undefined): LiveTrainingDraftProvenance | null {
  if (!row || typeof row !== "object") return null;
  const signals = row.contextSignals;
  const contextSignals = Array.isArray(signals)
    ? signals.filter((s): s is string => typeof s === "string")
    : [];
  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const base: LiveTrainingDraftProvenance = {
    contextUsed: Boolean(row.contextUsed),
    contextAdjustedPlayerMatch: Boolean(row.contextAdjustedPlayerMatch),
    contextAdjustedCategory: Boolean(row.contextAdjustedCategory),
    contextAdjustedSentiment: Boolean(row.contextAdjustedSentiment),
    parserConfidenceBeforeContext: numOrNull(row.parserConfidenceBeforeContext),
    parserConfidenceAfterContext: numOrNull(row.parserConfidenceAfterContext),
    contextSignals,
  };
  if (typeof row.contextSuggestionPlayerId === "string" && row.contextSuggestionPlayerId.trim()) {
    base.contextSuggestionPlayerId = row.contextSuggestionPlayerId.trim();
  }
  if (typeof row.contextSuggestionPlayerName === "string" && row.contextSuggestionPlayerName.trim()) {
    base.contextSuggestionPlayerName = row.contextSuggestionPlayerName.trim();
  }
  if (typeof row.contextSuggestionCategory === "string" && row.contextSuggestionCategory.trim()) {
    base.contextSuggestionCategory = row.contextSuggestionCategory.trim();
  }
  const cs = parseLiveTrainingSentiment(row.contextSuggestionSentiment);
  if (cs) base.contextSuggestionSentiment = cs;
  if (row.blockContextUsed === true) base.blockContextUsed = true;
  const bsig = row.blockContextSignals;
  if (Array.isArray(bsig)) {
    base.blockContextSignals = bsig.filter((s): s is string => typeof s === "string");
  }
  const pms = row.contextAdjustedPlayerMatchSource;
  if (pms === "snapshot" || pms === "focus_block" || pms === "start_priority") {
    base.contextAdjustedPlayerMatchSource = pms;
  }
  const ccs = row.contextAdjustedCategorySource;
  if (
    ccs === "snapshot" ||
    ccs === "main_block" ||
    ccs === "reinforcement_block" ||
    ccs === "warmup_block" ||
    ccs === "start_priority"
  ) {
    base.contextAdjustedCategorySource = ccs;
  }
  const css = row.contextAdjustedSentimentSource;
  if (css === "snapshot" || css === "reinforcement_block") {
    base.contextAdjustedSentimentSource = css;
  }
  if (row.startPriorityUsed === true) base.startPriorityUsed = true;
  const sps = row.startPrioritySignals;
  if (Array.isArray(sps)) {
    base.startPrioritySignals = sps.filter((x): x is string => typeof x === "string");
  }
  if (row.startPriorityPlayerHit === true) base.startPriorityPlayerHit = true;
  if (row.startPriorityDomainHit === true) base.startPriorityDomainHit = true;
  if (row.startPriorityReinforcementHit === true) base.startPriorityReinforcementHit = true;
  return base;
}

const CORRECTION_SUGGESTION_SOURCE_LAYERS = new Set<LiveTrainingDraftCorrectionSuggestion["sourceLayer"]>([
  "focus_block",
  "main_block",
  "reinforcement_block",
  "warmup_block",
  "snapshot",
]);

const CORRECTION_SUGGESTION_PRIORITIES = new Set<NonNullable<LiveTrainingDraftCorrectionSuggestion["suggestionPriority"]>>([
  "high",
  "medium",
  "low",
]);

const CORRECTION_SUGGESTION_CONFIDENCES = new Set<
  NonNullable<LiveTrainingDraftCorrectionSuggestion["suggestionConfidence"]>
>(["high", "medium", "low"]);

function parseCorrectionSuggestionSourceLayer(
  v: unknown
): LiveTrainingDraftCorrectionSuggestion["sourceLayer"] | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim() as LiveTrainingDraftCorrectionSuggestion["sourceLayer"];
  return CORRECTION_SUGGESTION_SOURCE_LAYERS.has(s) ? s : undefined;
}

function parseCorrectionSuggestionPriority(
  v: unknown
): LiveTrainingDraftCorrectionSuggestion["suggestionPriority"] | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim() as NonNullable<LiveTrainingDraftCorrectionSuggestion["suggestionPriority"]>;
  return CORRECTION_SUGGESTION_PRIORITIES.has(s) ? s : undefined;
}

function parseCorrectionSuggestionConfidence(
  v: unknown
): LiveTrainingDraftCorrectionSuggestion["suggestionConfidence"] | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim() as NonNullable<LiveTrainingDraftCorrectionSuggestion["suggestionConfidence"]>;
  return CORRECTION_SUGGESTION_CONFIDENCES.has(s) ? s : undefined;
}

function mapDraftCorrectionSuggestions(
  raw: ApiDraftCorrectionSuggestionRow[] | null | undefined
): LiveTrainingDraftCorrectionSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const out: LiveTrainingDraftCorrectionSuggestion[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const id = typeof r.id === "string" ? r.id.trim() : "";
    const st = r.suggestionType;
    if (!id || (st !== "player" && st !== "category" && st !== "sentiment")) continue;
    const label = typeof r.label === "string" ? r.label : "";
    const value = typeof r.value === "string" ? r.value : "";
    const tone = r.tone;
    if (tone !== "neutral" && tone !== "attention" && tone !== "positive") continue;
    const p = r.patch && typeof r.patch === "object" ? (r.patch as Record<string, unknown>) : {};
    const patch: LiveTrainingDraftCorrectionSuggestion["patch"] = {};
    if ("playerId" in p) {
      if (p.playerId === null) patch.playerId = null;
      else if (typeof p.playerId === "string" && p.playerId.trim()) patch.playerId = p.playerId.trim();
    }
    if ("playerNameRaw" in p) {
      if (p.playerNameRaw === null) patch.playerNameRaw = null;
      else if (typeof p.playerNameRaw === "string") patch.playerNameRaw = p.playerNameRaw.trim() || null;
    }
    if (typeof p.category === "string" && p.category.trim()) patch.category = p.category.trim();
    const ps = parseLiveTrainingSentiment(p.sentiment);
    if (ps) patch.sentiment = ps;
    const layer = parseCorrectionSuggestionSourceLayer(r.sourceLayer);
    const pr = parseCorrectionSuggestionPriority(r.suggestionPriority);
    const cf = parseCorrectionSuggestionConfidence(r.suggestionConfidence);
    const row: LiveTrainingDraftCorrectionSuggestion = {
      id,
      suggestionType: st,
      label,
      value,
      tone,
      patch,
    };
    if (layer) row.sourceLayer = layer;
    if (pr) row.suggestionPriority = pr;
    if (cf) row.suggestionConfidence = cf;
    out.push(row);
  }
  return out;
}

function mapDraft(row: ApiDraftRow): LiveTrainingObservationDraft {
  const interpretation = mapArenaInterpretation(row.interpretation);
  const coachDecision = mapArenaCoachDecision(row.coachDecision);
  return {
    id: row.id,
    sessionId: row.sessionId,
    playerId: row.playerId,
    playerNameRaw: row.playerNameRaw,
    sourceText: row.sourceText,
    category: row.category,
    sentiment: row.sentiment as LiveTrainingObservationDraft["sentiment"],
    confidence: row.confidence,
    needsReview: row.needsReview,
    provenance: mapDraftProvenance(row.provenance),
    correctionSuggestions: mapDraftCorrectionSuggestions(row.correctionSuggestions),
    ...(interpretation !== undefined ? { interpretation } : {}),
    ...(coachDecision !== undefined ? { coachDecision } : {}),
  };
}

function pickSessionIdFrom409(e: ApiRequestError): string | undefined {
  const p = e.body;
  if (p && typeof p === "object" && "sessionId" in p) {
    const s = (p as { sessionId?: unknown }).sessionId;
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return undefined;
}

export const LIVE_TRAINING_START_ROUTE = "/live-training/start" as const;

export type LiveTrainingStartPlanningPlayerFocus = {
  playerId: string;
  playerName: string;
  reasons: string[];
  priority: "high" | "medium" | "low";
};

export type LiveTrainingStartPlanningDomainFocus = {
  domain: string;
  labelRu: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

export type LiveTrainingStartPlanningReinforce = {
  domain: string;
  labelRu: string;
  reason: string;
};

export type LiveTrainingPlanSeedBlock = {
  type: "warmup" | "main" | "focus" | "reinforcement";
  title: string;
  description: string;
  linkedDomains?: string[];
  focusPlayers?: Array<{ playerId: string; playerName: string }>;
};

export type LiveTrainingPlanSeedsPayload = {
  blocks: LiveTrainingPlanSeedBlock[];
  lowData: boolean;
};

export type LiveTrainingCarryForwardPlayerSource =
  | "follow_up"
  | "recent_wrap_up"
  | "planning_focus"
  | "continuity_lock_in"
  | "unresolved_priority_carry_forward";

export type LiveTrainingCarryForwardDomainSource =
  | "follow_up"
  | "recent_wrap_up"
  | "planning_focus"
  | "continuity_lock_in"
  | "unresolved_priority_carry_forward";

export type LiveTrainingCarryForwardReinforceSource =
  | "follow_up"
  | "planning_focus"
  | "continuity_lock_in"
  | "unresolved_priority_carry_forward";

/** PHASE 28: continuity layer; null from API when nothing to show */
export type LiveTrainingCarryForwardSummary = {
  teamId: string;
  carryForwardSummary: string[];
  focusPlayers: Array<{
    playerId: string;
    playerName: string;
    reason: string;
    source: LiveTrainingCarryForwardPlayerSource;
  }>;
  focusDomains: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    source: LiveTrainingCarryForwardDomainSource;
  }>;
  reinforceAreas: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    source: LiveTrainingCarryForwardReinforceSource;
  }>;
  lowData: boolean;
};

/** PHASE 41: приоритеты старта (тот же набор source, что у carry-forward + recent_wrap у доменов). */
export type LiveTrainingStartPrioritySource =
  | "continuity_lock_in"
  | "follow_up"
  | "planning_focus"
  | "recent_wrap_up"
  | "unresolved_priority_carry_forward";

export type LiveTrainingStartPriorities = {
  primaryPlayers: Array<{
    playerId: string;
    playerName: string;
    reason: string;
    source: LiveTrainingStartPrioritySource;
  }>;
  primaryDomains: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    source: LiveTrainingStartPrioritySource;
  }>;
  secondaryItems: string[];
  reinforcementItems: string[];
  summaryLine?: string;
  lowData: boolean;
};

/** PHASE 47: компактные паттерны по недавним continuity (опционально с сервера). */
export type LiveTrainingCoachIntelligenceSignalType =
  | "repeated_player_gap"
  | "repeated_domain_gap"
  | "repeated_reinforcement_gap"
  | "weak_execution_streak"
  | "carry_forward_pressure";

export type LiveTrainingCoachIntelligenceSignal = {
  type: LiveTrainingCoachIntelligenceSignalType;
  severity: "low" | "medium" | "high";
  playerIds?: string[];
  domains?: string[];
  count?: number;
  explanation: string;
};

export type LiveTrainingCoachIntelligencePayload = {
  signals: LiveTrainingCoachIntelligenceSignal[];
  summaryLines: string[];
  executionPressureMode: "normal" | "watch" | "tighten";
};

/** Семена «удержать из прошлой фиксации» — рекомпозиция с сервера из planning snapshot последней сессии. */
export type LiveTrainingCarryForwardSeedDto = {
  source: "finalize_carry_forward";
  worthRechecking: string[];
  possibleCarryForward: string[];
  optionalContextOnly: string[];
  sessionId: string;
};

/** Компактная сводка непрерывности на старте (не источник истины). */
export type CoachCrossSessionContinuitySummaryDto = {
  carryFromPreviousCycle: string[];
  recurringNow: string[];
  stabilizingAreas: string[];
  currentFocus: string[];
  confidence: "low" | "moderate" | "high";
  note?: string;
};

export type LiveTrainingStartPlanningSummary = {
  teamId: string;
  focusPlayers: LiveTrainingStartPlanningPlayerFocus[];
  focusDomains: LiveTrainingStartPlanningDomainFocus[];
  reinforceAreas: LiveTrainingStartPlanningReinforce[];
  summaryLines: string[];
  lowData: boolean;
  planSeeds: LiveTrainingPlanSeedsPayload;
  carryForward?: LiveTrainingCarryForwardSummary | null;
  /** PHASE 41: с сервера всегда приходит при start-planning */
  startPriorities?: LiveTrainingStartPriorities;
  /** PHASE 46: режим адаптации от закрытия приоритетов прошлой сессии */
  priorAlignmentAdaptive?: { executionMode: "stable" | "recover" | "reset" };
  /** PHASE 47 */
  coachIntelligence?: LiveTrainingCoachIntelligencePayload;
  /** Подсказки с последней подтверждённой сессии (пятёрка / сессия / ручная проверка). */
  lastSessionHandoffHints?: string[];
  /** Опциональные ориентиры из отчётного слоя прошлого planning snapshot (может отсутствовать у старых API). */
  carryForwardSeed?: LiveTrainingCarryForwardSeedDto | null;
  /** Сжатый «контекст цикла» из уже посчитанных слоёв start-planning. */
  continuitySummary?: CoachCrossSessionContinuitySummaryDto | null;
};

export async function fetchLiveTrainingStartPlanning(
  teamId: string
): Promise<LiveTrainingStartPlanningSummary> {
  const headers = await getCoachAuthHeaders();
  const q = new URLSearchParams({ teamId });
  return apiFetch<LiveTrainingStartPlanningSummary>(
    `/api/live-training/start-planning?${q.toString()}`,
    { headers }
  );
}

export async function startLiveTrainingSession(params: {
  teamId: string;
  /** Оставлено для совместимости с UI; сервер берёт имя команды из БД. */
  teamName?: string;
  mode: LiveTrainingMode;
  /** PHASE 19: опциональный снимок planning-контекста со стартового экрана. */
  planningSnapshot?: LiveTrainingPlanningSnapshot;
  /** Контекст слота CRM → planningSnapshotJson.scheduleSlotContext на сервере. */
  scheduleSlotContext?: Record<string, unknown>;
}): Promise<LiveTrainingSession> {
  const headers = await getCoachAuthHeaders();
  try {
    const body: Record<string, unknown> = { teamId: params.teamId, mode: params.mode };
    if (params.planningSnapshot) {
      body.planningSnapshot = params.planningSnapshot;
    }
    if (params.scheduleSlotContext) {
      body.scheduleSlotContext = params.scheduleSlotContext;
      const slotId =
        typeof params.scheduleSlotContext.trainingSlotId === "string"
          ? params.scheduleSlotContext.trainingSlotId.trim()
          : "";
      if (slotId) {
        body.trainingSessionId = slotId;
      }
    }
    const raw = await apiFetch<ApiSessionRow>(BASE, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return mapSession(raw);
  } catch (e) {
    if (isApi409(e)) {
      const sid = pickSessionIdFrom409(e);
      if (sid) throw new LiveTrainingSessionConflictError(sid);
    }
    throw e;
  }
}

export class LiveTrainingSessionConflictError extends Error {
  constructor(public readonly sessionId: string) {
    super("ACTIVE_LIVE_TRAINING_EXISTS");
    this.name = "LiveTrainingSessionConflictError";
  }
}

export async function finishLiveTrainingSession(sessionId: string): Promise<{
  session: LiveTrainingSession;
  autoFinalized: boolean;
}> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<ApiSessionRow>(`${BASE}/${encodeURIComponent(sessionId)}/finish`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const autoFinalized = Boolean(raw.autoFinalized);
  return { session: mapSession(raw), autoFinalized };
}

export async function getLiveTrainingSession(sessionId: string): Promise<LiveTrainingSession | null> {
  const headers = await getCoachAuthHeaders();
  try {
    const raw = await apiFetch<ApiSessionRow>(
      `${BASE}/${encodeURIComponent(sessionId)}`,
      { method: "GET", headers }
    );
    return mapSession(raw);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    throw e;
  }
}

export async function getLiveTrainingDrafts(
  sessionId: string,
  options?: { reviewListScope?: "exceptions" | "all" }
): Promise<LiveTrainingObservationDraft[]> {
  const headers = await getCoachAuthHeaders();
  const scopeQ =
    options?.reviewListScope === "all" ? "?reviewListScope=all" : "";
  const raw = await apiFetch<ApiDraftRow[]>(
    `${BASE}/${encodeURIComponent(sessionId)}/drafts${scopeQ}`,
    { method: "GET", headers }
  );
  return Array.isArray(raw) ? raw.map(mapDraft) : [];
}

export async function getLiveTrainingReviewState(
  sessionId: string,
  options?: { reviewListScope?: "exceptions" | "all" }
): Promise<LiveTrainingReviewState | null> {
  const headers = await getCoachAuthHeaders();
  const scopeQ =
    options?.reviewListScope === "all" ? "?reviewListScope=all" : "";
  try {
    const raw = await apiFetch<{
      sessionId: string;
      drafts: ApiDraftRow[];
      roster?: Array<{ id: string; name: string }>;
      reviewSummary?: {
        toConfirmCount: number;
        needsReviewCount: number;
        unassignedCount: number;
        excludedCount: number;
        totalActiveDraftCount?: number;
        reviewListScope?: "exceptions" | "all";
      };
      preConfirmSummary?: {
        playersWithDraftsCount?: number;
        topDraftPlayers?: Array<{
          playerId?: string;
          playerName?: string;
          draftCount?: number;
        }>;
      };
      unresolvedCount: number;
      confirmedCount: number;
    }>(`${BASE}/${encodeURIComponent(sessionId)}/review-state${scopeQ}`, { method: "GET", headers });
    const drafts = (raw.drafts ?? []).map(mapDraft);
    const roster: LiveTrainingReviewRosterEntry[] = Array.isArray(raw.roster)
      ? raw.roster.map((r) => ({
          id: String(r.id),
          name: String(r.name ?? ""),
        }))
      : [];
    const reviewSummary: LiveTrainingReviewSummary = raw.reviewSummary
      ? {
          toConfirmCount: Number(raw.reviewSummary.toConfirmCount ?? 0),
          needsReviewCount: Number(raw.reviewSummary.needsReviewCount ?? 0),
          unassignedCount: Number(raw.reviewSummary.unassignedCount ?? 0),
          excludedCount: Number(raw.reviewSummary.excludedCount ?? 0),
          totalActiveDraftCount:
            raw.reviewSummary.totalActiveDraftCount !== undefined
              ? Number(raw.reviewSummary.totalActiveDraftCount)
              : undefined,
          reviewListScope: raw.reviewSummary.reviewListScope,
        }
      : {
          toConfirmCount: drafts.length,
          needsReviewCount: raw.unresolvedCount ?? 0,
          unassignedCount: drafts.filter((d) => !d.playerId).length,
          excludedCount: 0,
        };
    const preConfirmSummary: LiveTrainingPreConfirmSummary = raw.preConfirmSummary
      ? {
          playersWithDraftsCount: Number(raw.preConfirmSummary.playersWithDraftsCount ?? 0),
          topDraftPlayers: Array.isArray(raw.preConfirmSummary.topDraftPlayers)
            ? raw.preConfirmSummary.topDraftPlayers.map((p) => ({
                playerId: String(p.playerId ?? ""),
                playerName: String(p.playerName ?? "Игрок"),
                draftCount: Number(p.draftCount ?? 0),
              }))
            : [],
        }
      : {
          playersWithDraftsCount: new Set(drafts.map((d) => d.playerId).filter(Boolean)).size,
          topDraftPlayers: [],
        };
    return {
      sessionId: raw.sessionId,
      drafts,
      roster,
      reviewSummary,
      preConfirmSummary,
      unresolvedCount: raw.unresolvedCount,
      confirmedCount: raw.confirmedCount,
    };
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    throw e;
  }
}

export type LiveTrainingPatchDraftBody = {
  sourceText: string;
  playerId: string | null;
  category: string;
  sentiment: LiveTrainingSentiment;
  needsReview: boolean;
  /** Идемпотентность PATCH; сервер может игнорировать до внедрения */
  clientMutationId?: string;
};

export async function patchLiveTrainingDraft(
  sessionId: string,
  draftId: string,
  body: LiveTrainingPatchDraftBody
): Promise<LiveTrainingObservationDraft> {
  return withLiveTrainingTransientRetry(async () => {
  const headers = await getCoachAuthHeaders();
  const payload: Record<string, unknown> = {
    sourceText: body.sourceText,
    playerId: body.playerId,
    category: body.category,
    sentiment: body.sentiment,
    needsReview: body.needsReview,
  };
  if (body.clientMutationId != null && String(body.clientMutationId).trim()) {
    payload.clientMutationId = String(body.clientMutationId).trim();
  }
  const raw = await apiFetch<ApiDraftRow>(
    `${BASE}/${encodeURIComponent(sessionId)}/drafts/${encodeURIComponent(draftId)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    }
  );
  return mapDraft(raw);
  });
}

/** PHASE 23: одна быстрая правка через существующий PATCH (merge patch в текущий черновик). */
export async function applyLiveTrainingDraftSuggestionMerge(
  sessionId: string,
  draft: LiveTrainingObservationDraft,
  suggestion: Pick<LiveTrainingDraftCorrectionSuggestion, "patch">,
  /** Один id на тап чипа; при retry внутри `withLiveTrainingTransientRetry` тот же PATCH body */
  clientMutationId?: string
): Promise<LiveTrainingObservationDraft> {
  const { patch } = suggestion;
  const playerId = patch.playerId !== undefined ? patch.playerId : draft.playerId;
  const category = patch.category ?? draft.category;
  const sentiment = patch.sentiment ?? draft.sentiment;
  const mid =
    typeof clientMutationId === "string" && clientMutationId.trim()
      ? clientMutationId.trim()
      : createClientMutationId();
  return patchLiveTrainingDraft(sessionId, draft.id, {
    sourceText: draft.sourceText,
    playerId,
    category,
    sentiment,
    needsReview: draft.needsReview,
    clientMutationId: mid,
  });
}

export async function deleteLiveTrainingDraft(
  sessionId: string,
  draftId: string,
  options?: { clientMutationId?: string }
): Promise<void> {
  return withLiveTrainingTransientRetry(async () => {
  const headers: Record<string, string> = { ...(await getCoachAuthHeaders()) };
  const mid = options?.clientMutationId?.trim();
  if (mid) {
    headers["X-Client-Mutation-Id"] = mid;
  }
  await apiFetch<null>(
    `${BASE}/${encodeURIComponent(sessionId)}/drafts/${encodeURIComponent(draftId)}`,
    { method: "DELETE", headers }
  );
  });
}

function mapCoachPreviewNarrativeMetaV1(raw: unknown): LiveTrainingCoachPreviewNarrativeMetaV1 | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    sessionSummaryLinesManuallyEdited: o.sessionSummaryLinesManuallyEdited === true,
    focusAreasManuallyEdited: o.focusAreasManuallyEdited === true,
    playerHighlightsManuallyEdited: o.playerHighlightsManuallyEdited === true,
  };
}

function coachNarrativeHighlightTextFromRaw(z: Record<string, unknown>): string {
  const t = typeof z.text === "string" ? z.text.trim() : "";
  if (t.length > 0) return t;
  return typeof z.summaryLine === "string" ? z.summaryLine.trim() : "";
}

function mapCoachPreviewNarrativeV1(raw: unknown): LiveTrainingCoachPreviewNarrativeV1 | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const linesRaw = Array.isArray(o.sessionSummaryLines) ? o.sessionSummaryLines : [];
  const focusRaw = Array.isArray(o.focusAreas) ? o.focusAreas : [];
  const phRaw = Array.isArray(o.playerHighlights) ? o.playerHighlights : [];
  const sessionSummaryLines = linesRaw.map((x) => String(x ?? "")).filter((s) => s.length > 0);
  const focusAreas = focusRaw.map((x) => String(x ?? "")).filter((s) => s.length > 0);
  const playerHighlights = phRaw
    .filter((h) => h && typeof h === "object")
    .map((h) => {
      const z = h as Record<string, unknown>;
      const text = coachNarrativeHighlightTextFromRaw(z);
      if (!text) return null;
      const item: LiveTrainingCoachPreviewNarrativeV1["playerHighlights"][number] = { text };
      if (typeof z.playerId === "string" && z.playerId.trim()) item.playerId = z.playerId.trim();
      else if (z.playerId === null) item.playerId = null;
      if (typeof z.playerName === "string" && z.playerName.trim()) item.playerName = z.playerName.trim();
      else if (z.playerName === null) item.playerName = null;
      return item;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  return { sessionSummaryLines, focusAreas, playerHighlights };
}

function mapExternalWorkImpactV1(raw: unknown): LiveTrainingExternalWorkImpactRowV1[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: LiveTrainingExternalWorkImpactRowV1[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const z = item as Record<string, unknown>;
    const status = z.status;
    if (status !== "helped" && status !== "no_clear_effect" && status !== "needs_more_time") continue;
    const note = typeof z.note === "string" ? z.note.trim() : "";
    const playerName =
      typeof z.playerName === "string" && z.playerName.trim() ? z.playerName.trim() : "Игрок";
    const playerId = typeof z.playerId === "string" && z.playerId.trim() ? z.playerId.trim() : undefined;
    if (!note) continue;
    out.push({ playerName, status: status as LiveTrainingExternalWorkImpactRowV1["status"], note, ...(playerId ? { playerId } : {}) });
  }
  return out.length > 0 ? out : undefined;
}

function mapSessionMeaningNextActionsV1(
  raw: unknown
): LiveTrainingSessionMeaningNextActionsV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const team = Array.isArray(o.team)
    ? o.team.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const nextTrainingFocus = Array.isArray(o.nextTrainingFocus)
    ? o.nextTrainingFocus.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const playersRaw = Array.isArray(o.players) ? o.players : [];
  const players = playersRaw
    .filter((p) => p && typeof p === "object")
    .map((p) => {
      const z = p as Record<string, unknown>;
      const playerId = typeof z.playerId === "string" ? z.playerId.trim() : "";
      const playerName =
        typeof z.playerName === "string" && z.playerName.trim() ? z.playerName.trim() : "Игрок";
      const actions = Array.isArray(z.actions)
        ? z.actions.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        : [];
      return { playerId, playerName, actions };
    })
    .filter((p) => p.playerId.length > 0);
  if (team.length === 0 && players.length === 0 && nextTrainingFocus.length === 0) return undefined;
  return { team, players, nextTrainingFocus };
}

function mapSessionMeaningParentActionsV1(
  raw: unknown
): LiveTrainingSessionMeaningParentActionRowV1[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: LiveTrainingSessionMeaningParentActionRowV1[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const z = p as Record<string, unknown>;
    const playerId = typeof z.playerId === "string" ? z.playerId.trim() : "";
    const playerName =
      typeof z.playerName === "string" && z.playerName.trim() ? z.playerName.trim() : "Игрок";
    const actions = Array.isArray(z.actions)
      ? z.actions.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      : [];
    if (!playerId || actions.length === 0) continue;
    out.push({ playerId, playerName, actions });
  }
  return out.length > 0 ? out : undefined;
}

function mapSessionMeaningProgressV1(
  raw: unknown
): LiveTrainingSessionMeaningProgressV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const team = Array.isArray(o.team)
    ? o.team.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const playersRaw = Array.isArray(o.players) ? o.players : [];
  const players = playersRaw
    .filter((p) => p && typeof p === "object")
    .map((p) => {
      const z = p as Record<string, unknown>;
      const playerId = typeof z.playerId === "string" ? z.playerId.trim() : "";
      const playerName =
        typeof z.playerName === "string" && z.playerName.trim() ? z.playerName.trim() : "Игрок";
      const prog = z.progress;
      const note = typeof z.note === "string" ? z.note.trim() : "";
      if (prog !== "improved" && prog !== "no_change" && prog !== "regressed") return null;
      if (!playerId) return null;
      return {
        playerId,
        playerName,
        progress: prog as "improved" | "no_change" | "regressed",
        note,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  if (team.length === 0 && players.length === 0) return undefined;
  return { team, players };
}

function mapSessionMeaningActionTriggersV1(
  raw: unknown
): LiveTrainingSessionMeaningActionTriggerV1[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: LiveTrainingSessionMeaningActionTriggerV1[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const z = item as Record<string, unknown>;
    const type = z.type;
    const target = z.target;
    if (type !== "extra_training" && type !== "attention_required" && type !== "progress_high") continue;
    if (target !== "player" && target !== "team") continue;
    const reason = typeof z.reason === "string" ? z.reason.trim() : "";
    if (!reason) continue;
    const playerId = typeof z.playerId === "string" && z.playerId.trim() ? z.playerId.trim() : undefined;
    out.push({
      type,
      target,
      ...(playerId ? { playerId } : {}),
      reason,
    });
  }
  return out.length > 0 ? out : undefined;
}

function parentSafeActionTriggersFromSummary(
  arr: LiveTrainingSessionMeaningActionTriggerV1[] | undefined
): LiveTrainingSessionMeaningActionTriggerV1[] | undefined {
  if (!arr?.length) return undefined;
  const f = arr.filter((t) => t.type === "progress_high");
  return f.length > 0 ? f : undefined;
}

function mapSuggestedParentActionsV1(
  raw: unknown
): LiveTrainingSessionMeaningSuggestedParentV1[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: LiveTrainingSessionMeaningSuggestedParentV1[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const z = item as Record<string, unknown>;
    if (z.type !== "progress_high") continue;
    const title = typeof z.title === "string" ? z.title.trim() : "";
    const description = typeof z.description === "string" ? z.description.trim() : "";
    if (!title || !description) continue;
    const playerId = typeof z.playerId === "string" && z.playerId.trim() ? z.playerId.trim() : undefined;
    out.push({
      type: "progress_high",
      ...(playerId ? { playerId } : {}),
      title,
      description,
    });
  }
  return out.length > 0 ? out : undefined;
}

function mapSessionMeaningSuggestedActionsV1(
  raw: unknown
): LiveTrainingSessionMeaningSuggestedActionsV1 | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const coachRaw = Array.isArray(o.coach) ? o.coach : [];
  const parentRaw = Array.isArray(o.parent) ? o.parent : [];
  const coach = coachRaw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const z = x as Record<string, unknown>;
      const type = z.type;
      const target = z.target;
      if (type !== "attention_required" && type !== "extra_training" && type !== "progress_high")
        return null;
      if (target !== "player" && target !== "team") return null;
      const title = typeof z.title === "string" ? z.title.trim() : "";
      const description = typeof z.description === "string" ? z.description.trim() : "";
      const cta = typeof z.cta === "string" ? z.cta.trim() : "";
      if (!title || !description || !cta) return null;
      const playerId = typeof z.playerId === "string" && z.playerId.trim() ? z.playerId.trim() : undefined;
      let recommendedCoaches: LiveTrainingSessionMeaningSuggestedRecommendedCoachV1[] | undefined;
      const rcRaw = z.recommendedCoaches;
      if (Array.isArray(rcRaw)) {
        const rc: LiveTrainingSessionMeaningSuggestedRecommendedCoachV1[] = [];
        for (const r of rcRaw) {
          if (!r || typeof r !== "object") continue;
          const q = r as Record<string, unknown>;
          const rid = typeof q.id === "string" ? q.id.trim() : "";
          const rname = typeof q.name === "string" ? q.name.trim() : "";
          const skills = Array.isArray(q.skills)
            ? q.skills.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim())
            : [];
          if (!rid || !rname) continue;
          rc.push({ id: rid, name: rname, skills });
        }
        if (rc.length > 0) recommendedCoaches = rc;
      }
      return {
        type: type as LiveTrainingSessionMeaningSuggestedCoachV1["type"],
        target: target as LiveTrainingSessionMeaningSuggestedCoachV1["target"],
        ...(playerId ? { playerId } : {}),
        title,
        description,
        cta,
        ...(recommendedCoaches ? { recommendedCoaches } : {}),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  const parent = parentRaw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const z = x as Record<string, unknown>;
      if (z.type !== "progress_high") return null;
      const title = typeof z.title === "string" ? z.title.trim() : "";
      const description = typeof z.description === "string" ? z.description.trim() : "";
      if (!title || !description) return null;
      const playerId = typeof z.playerId === "string" && z.playerId.trim() ? z.playerId.trim() : undefined;
      return {
        type: "progress_high" as const,
        ...(playerId ? { playerId } : {}),
        title,
        description,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  if (coach.length === 0 && parent.length === 0) return undefined;
  return { coach, parent };
}

function mapReportDraftSummary(raw: unknown): LiveTrainingSessionReportDraftSummary {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sessionMeta = o.sessionMeta && typeof o.sessionMeta === "object" ? (o.sessionMeta as Record<string, unknown>) : {};
  const counters = o.counters && typeof o.counters === "object" ? (o.counters as Record<string, unknown>) : {};
  const notes = o.notes && typeof o.notes === "object" ? (o.notes as Record<string, unknown>) : {};
  const playersRaw = Array.isArray(o.players) ? o.players : [];

  const players: LiveTrainingReportDraftPlayerSummary[] = playersRaw.map((p) => {
    const x = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
    const ev = Array.isArray(x.evidence) ? x.evidence : [];
    return {
      playerId: String(x.playerId ?? ""),
      playerName: String(x.playerName ?? "Игрок"),
      totalSignals: Number(x.totalSignals ?? 0),
      positiveCount: Number(x.positiveCount ?? 0),
      negativeCount: Number(x.negativeCount ?? 0),
      neutralCount: Number(x.neutralCount ?? 0),
      topDomains: Array.isArray(x.topDomains) ? x.topDomains.map(String) : [],
      evidence: ev
        .filter((e) => e && typeof e === "object")
        .map((e) => {
          const z = e as Record<string, unknown>;
          return {
            text: String(z.text ?? ""),
            direction: String(z.direction ?? "neutral"),
            domain: String(z.domain ?? ""),
          } satisfies LiveTrainingReportDraftEvidenceItem;
        }),
    };
  });

  const mapNotes = (arr: unknown): LiveTrainingReportDraftNoteItem[] =>
    Array.isArray(arr)
      ? arr
          .filter((n) => n && typeof n === "object")
          .map((n) => {
            const z = n as Record<string, unknown>;
            const item: LiveTrainingReportDraftNoteItem = {
              text: String(z.text ?? ""),
            };
            if (typeof z.playerId === "string") item.playerId = z.playerId;
            if (typeof z.playerName === "string") item.playerName = z.playerName;
            return item;
          })
      : [];

  return {
    sessionMeta: {
      teamName: String(sessionMeta.teamName ?? ""),
      mode: String(sessionMeta.mode ?? ""),
      startedAt: String(sessionMeta.startedAt ?? ""),
      endedAt: typeof sessionMeta.endedAt === "string" ? sessionMeta.endedAt : null,
      confirmedAt: typeof sessionMeta.confirmedAt === "string" ? sessionMeta.confirmedAt : null,
    },
    counters: {
      includedDraftsCount: Number(counters.includedDraftsCount ?? 0),
      signalsCreatedCount: Number(counters.signalsCreatedCount ?? 0),
      affectedPlayersCount: Number(counters.affectedPlayersCount ?? 0),
      positiveSignalsCount: Number(counters.positiveSignalsCount ?? 0),
      negativeSignalsCount: Number(counters.negativeSignalsCount ?? 0),
      neutralSignalsCount: Number(counters.neutralSignalsCount ?? 0),
      excludedDraftsCount: Number(counters.excludedDraftsCount ?? 0),
      draftsFlaggedNeedsReview: Number(counters.draftsFlaggedNeedsReview ?? 0),
    },
    focusDomains: Array.isArray(o.focusDomains) ? o.focusDomains.map(String) : [],
    players,
    notes: {
      needsAttention: mapNotes(notes.needsAttention),
      positives: mapNotes(notes.positives),
    },
    coachPreviewNarrativeV1: mapCoachPreviewNarrativeV1(o.coachPreviewNarrativeV1),
    coachPreviewNarrativeMetaV1: mapCoachPreviewNarrativeMetaV1(o.coachPreviewNarrativeMetaV1),
    sessionMeaningNextActionsV1: mapSessionMeaningNextActionsV1(o.sessionMeaningNextActionsV1),
    sessionMeaningParentActionsV1: mapSessionMeaningParentActionsV1(o.sessionMeaningParentActionsV1),
    sessionMeaningProgressV1: mapSessionMeaningProgressV1(o.sessionMeaningProgressV1),
    sessionMeaningActionTriggersV1: mapSessionMeaningActionTriggersV1(o.sessionMeaningActionTriggersV1),
    sessionMeaningSuggestedActionsV1: mapSessionMeaningSuggestedActionsV1(o.sessionMeaningSuggestedActionsV1),
    externalWorkImpactV1: mapExternalWorkImpactV1(o.externalWorkImpactV1),
  };
}

type ReportDraftApiResponse = {
  reportDraft: {
    id: string;
    liveTrainingSessionId?: string;
    status: string;
    title: string;
    publishedAt?: string | null;
    summary: unknown;
  };
  audienceViews?: LiveTrainingReportAudienceViews;
  finalReport?: {
    trainingId: string;
    summary?: string | null;
    focusAreas?: string | null;
    coachNote?: string | null;
    parentMessage?: string | null;
    updatedAt: string;
  };
  publishedFinalReport?: LiveTrainingPublishedFinalReportRead | null;
  externalCoachRecommendations?: unknown;
  arenaNextTrainingFocusApply?: unknown;
  plannedFocusSnapshot?: unknown;
  /** @deprecated — alias of `plannedFocusSnapshot` on server */
  plannedTrainingFocus?: unknown;
};

function mapExternalCoachRecommendations(raw: unknown): LiveTrainingReportDraftPayload["externalCoachRecommendations"] {
  if (!Array.isArray(raw)) return [];
  const out: LiveTrainingReportDraftPayload["externalCoachRecommendations"] = [];
  for (const row of raw) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.externalCoachId !== "string") continue;
    const liveSessionId = typeof r.liveSessionId === "string" ? r.liveSessionId : "";
    const playerId =
      r.playerId === null || r.playerId === undefined
        ? null
        : typeof r.playerId === "string"
          ? r.playerId
          : null;
    out.push({
      id: r.id,
      liveSessionId,
      playerId,
      externalCoachId: r.externalCoachId,
      triggerType: typeof r.triggerType === "string" ? r.triggerType : "extra_training",
      status: typeof r.status === "string" ? r.status : "pending",
      createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
      updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
    });
  }
  return out;
}

function defaultArenaNextTrainingFocusApply(): LiveTrainingReportDraftPayload["arenaNextTrainingFocusApply"] {
  return {
    nextSlotAvailable: false,
    applied: false,
    focusLineFromMeaning: null,
    appliedFocusLine: null,
    targetTrainingSessionId: null,
    appliedAt: null,
  };
}

function mapPlannedFocusSnapshot(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.trim();
}

function mapArenaNextTrainingFocusApply(
  raw: unknown
): LiveTrainingReportDraftPayload["arenaNextTrainingFocusApply"] {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultArenaNextTrainingFocusApply();
  }
  const o = raw as Record<string, unknown>;
  return {
    nextSlotAvailable: Boolean(o.nextSlotAvailable),
    applied: Boolean(o.applied),
    focusLineFromMeaning:
      typeof o.focusLineFromMeaning === "string" && o.focusLineFromMeaning.trim()
        ? o.focusLineFromMeaning.trim()
        : null,
    appliedFocusLine:
      typeof o.appliedFocusLine === "string" && o.appliedFocusLine.trim()
        ? o.appliedFocusLine.trim()
        : null,
    targetTrainingSessionId:
      typeof o.targetTrainingSessionId === "string" && o.targetTrainingSessionId.trim()
        ? o.targetTrainingSessionId.trim()
        : null,
    appliedAt: typeof o.appliedAt === "string" && o.appliedAt.trim() ? o.appliedAt.trim() : null,
  };
}

function mapPublishedFinalReportRead(raw: unknown): LiveTrainingPublishedFinalReportRead | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.trainingId !== "string") return null;
  const sn = (v: unknown): string | null =>
    typeof v === "string" ? v : v === null || v === undefined ? null : null;
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : "";
  const publishedAt =
    typeof o.publishedAt === "string" && o.publishedAt.trim() ? o.publishedAt.trim() : null;
  const sessionLabel =
    typeof o.sessionLabel === "string" && o.sessionLabel.trim() ? o.sessionLabel.trim() : null;
  return {
    trainingId: o.trainingId,
    summary: sn(o.summary),
    focusAreas: sn(o.focusAreas),
    coachNote: sn(o.coachNote),
    parentMessage: sn(o.parentMessage),
    updatedAt,
    publishedAt,
    sessionLabel,
  };
}

function mapReportDraftApiResponseToPayload(raw: ReportDraftApiResponse, sessionId: string): LiveTrainingReportDraftPayload {
  const d = raw.reportDraft;
  const summary = mapReportDraftSummary(d.summary);
  const publishedAt =
    typeof d.publishedAt === "string" && d.publishedAt.trim() ? d.publishedAt.trim() : null;
  const reportDraft: LiveTrainingSessionReportDraft = {
    id: String(d.id),
    liveTrainingSessionId: String(d.liveTrainingSessionId ?? sessionId),
    status: String(d.status ?? "draft"),
    title: String(d.title ?? ""),
    publishedAt,
    summary,
  };
  const cvRaw = raw.audienceViews?.coachView;
  const narrativeFromCoachView =
    cvRaw && typeof cvRaw === "object"
      ? mapCoachPreviewNarrativeV1((cvRaw as Record<string, unknown>).coachPreviewNarrativeV1)
      : undefined;
  const nextFromCoachView =
    cvRaw && typeof cvRaw === "object"
      ? mapSessionMeaningNextActionsV1((cvRaw as Record<string, unknown>).nextActions)
      : undefined;
  const progressFromCoachView =
    cvRaw && typeof cvRaw === "object"
      ? mapSessionMeaningProgressV1((cvRaw as Record<string, unknown>).sessionProgress)
      : undefined;
  const mergedSessionProgress = progressFromCoachView ?? summary.sessionMeaningProgressV1;
  const recsFromCoachView =
    cvRaw && typeof cvRaw === "object"
      ? mapSessionMeaningActionTriggersV1((cvRaw as Record<string, unknown>).arenaRecommendations)
      : undefined;
  const mergedArenaRecs = recsFromCoachView ?? summary.sessionMeaningActionTriggersV1;
  const parentSafeFallback = parentSafeActionTriggersFromSummary(summary.sessionMeaningActionTriggersV1);
  const suggestedFromCoachView =
    cvRaw && typeof cvRaw === "object"
      ? mapSessionMeaningSuggestedActionsV1((cvRaw as Record<string, unknown>).suggestedActions)
      : undefined;
  const mergedSuggested = suggestedFromCoachView ?? summary.sessionMeaningSuggestedActionsV1;

  const impactFromCoachView =
    cvRaw && typeof cvRaw === "object"
      ? mapExternalWorkImpactV1((cvRaw as Record<string, unknown>).externalWorkImpactV1)
      : undefined;
  const mergedExternalImpact =
    impactFromCoachView && impactFromCoachView.length > 0
      ? impactFromCoachView
      : summary.externalWorkImpactV1;

  const audienceViews =
    raw.audienceViews != null
      ? {
          ...raw.audienceViews,
          coachView: {
            ...raw.audienceViews.coachView,
            coachPreviewNarrativeV1: narrativeFromCoachView ?? summary.coachPreviewNarrativeV1,
            nextActions: nextFromCoachView ?? summary.sessionMeaningNextActionsV1,
            ...(mergedSessionProgress &&
            (mergedSessionProgress.team.length > 0 || mergedSessionProgress.players.length > 0)
              ? { sessionProgress: mergedSessionProgress }
              : {}),
            ...(mergedArenaRecs && mergedArenaRecs.length > 0
              ? { arenaRecommendations: [...mergedArenaRecs] }
              : {}),
            ...(mergedSuggested && mergedSuggested.coach.length > 0
              ? { suggestedActions: mergedSuggested }
              : {}),
            ...(mergedExternalImpact && mergedExternalImpact.length > 0
              ? { externalWorkImpactV1: [...mergedExternalImpact] }
              : {}),
          },
          parentView: {
            ...raw.audienceViews.parentView,
            ...(() => {
              const pv = raw.audienceViews!.parentView;
              const mergedPh =
                pv.progressHeadlineRu?.trim() ||
                buildParentProgressHeadlineRu(summary.sessionMeaningProgressV1);
              const parsedSafe = mapSessionMeaningActionTriggersV1(pv.arenaSafeRecommendations);
              const safeFromApi = parsedSafe?.filter((t) => t.type === "progress_high");
              const mergedSafe =
                safeFromApi && safeFromApi.length > 0 ? safeFromApi : parentSafeFallback;
              const parsedSp = mapSuggestedParentActionsV1(pv.suggestedParentActions);
              const mergedSp =
                parsedSp && parsedSp.length > 0
                  ? parsedSp
                  : mergedSuggested?.parent && mergedSuggested.parent.length > 0
                    ? mergedSuggested.parent
                    : undefined;
              return {
                ...(mergedPh ? { progressHeadlineRu: mergedPh } : {}),
                ...(mergedSafe && mergedSafe.length > 0
                  ? { arenaSafeRecommendations: mergedSafe }
                  : {}),
                ...(mergedSp && mergedSp.length > 0 ? { suggestedParentActions: mergedSp } : {}),
              };
            })(),
          },
        }
      : ({
          coachView: {
            sessionMeta: summary.sessionMeta,
            counters: summary.counters,
            focusDomains: summary.focusDomains,
            players: summary.players,
            notes: summary.notes,
            internalReminders: [],
            coachPreviewNarrativeV1: summary.coachPreviewNarrativeV1,
            nextActions: summary.sessionMeaningNextActionsV1,
            ...(mergedSessionProgress &&
            (mergedSessionProgress.team.length > 0 || mergedSessionProgress.players.length > 0)
              ? { sessionProgress: mergedSessionProgress }
              : {}),
            ...(mergedArenaRecs && mergedArenaRecs.length > 0
              ? { arenaRecommendations: [...mergedArenaRecs] }
              : {}),
            ...(mergedSuggested && mergedSuggested.coach.length > 0
              ? { suggestedActions: mergedSuggested }
              : {}),
            ...(mergedExternalImpact && mergedExternalImpact.length > 0
              ? { externalWorkImpactV1: [...mergedExternalImpact] }
              : {}),
          },
          parentView: {
            sessionMeta: {
              teamLabel: summary.sessionMeta.teamName,
              modeLabel: summary.sessionMeta.mode,
              dateLabel: summary.sessionMeta.startedAt,
            },
            overviewLines: [],
            highlights: [],
            developmentFocus: [],
            playerHighlights: [],
            supportNotes: [],
            ...(summary.sessionMeaningParentActionsV1?.length
              ? { parentActions: summary.sessionMeaningParentActionsV1 }
              : {}),
            ...(() => {
              const ph = buildParentProgressHeadlineRu(summary.sessionMeaningProgressV1);
              return ph ? { progressHeadlineRu: ph } : {};
            })(),
            ...(parentSafeFallback && parentSafeFallback.length > 0
              ? { arenaSafeRecommendations: parentSafeFallback }
              : {}),
            ...(mergedSuggested?.parent && mergedSuggested.parent.length > 0
              ? { suggestedParentActions: mergedSuggested.parent }
              : {}),
          },
          schoolView: {
            sessionMeta: summary.sessionMeta,
            teamSummaryLines: [],
            focusDomains: summary.focusDomains,
            playersInFocus: [],
            counters: summary.counters,
            monitoringNotes: [],
          },
        } satisfies LiveTrainingReportAudienceViews);
  const publishedFinalReport = mapPublishedFinalReportRead(raw.publishedFinalReport);
  const externalCoachRecommendations = mapExternalCoachRecommendations(raw.externalCoachRecommendations);
  const arenaNextTrainingFocusApply = mapArenaNextTrainingFocusApply(raw.arenaNextTrainingFocusApply);
  const plannedFocusSnapshot = mapPlannedFocusSnapshot(raw.plannedFocusSnapshot);
  // Legacy key: mirror canonical snapshot only (server sends both; avoid TrainingSession semantics).
  const plannedTrainingFocus = plannedFocusSnapshot;
  return {
    reportDraft,
    audienceViews,
    publishedFinalReport,
    externalCoachRecommendations,
    arenaNextTrainingFocusApply,
    plannedFocusSnapshot,
    plannedTrainingFocus,
  };
}

export async function getLiveTrainingReportDraft(sessionId: string): Promise<LiveTrainingReportDraftPayload> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<ReportDraftApiResponse>(
    `${BASE}/${encodeURIComponent(sessionId)}/report-draft`,
    { method: "GET", headers }
  );
  return mapReportDraftApiResponseToPayload(raw, sessionId);
}

/** Записать фокус следующей тренировки из SessionMeaning в ближайший слот расписания. */
export async function applyLiveTrainingArenaNextTrainingFocus(
  sessionId: string
): Promise<LiveTrainingReportDraftPayload["arenaNextTrainingFocusApply"]> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<{ arenaNextTrainingFocusApply?: unknown }>(
    `${BASE}/${encodeURIComponent(sessionId)}/apply-arena-next-training-focus`,
    { method: "POST", headers, body: "{}" }
  );
  return mapArenaNextTrainingFocusApply(raw.arenaNextTrainingFocusApply);
}

/** STEP 19: подтвердить кандидата из suggestedActions (без брони и оплаты). */
export async function confirmLiveTrainingExternalCoachRecommendation(
  sessionId: string,
  externalCoachId: string,
  playerId?: string | null
): Promise<void> {
  const headers = await getCoachAuthHeaders();
  await apiFetch(`${BASE}/${encodeURIComponent(sessionId)}/external-coach-recommendations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "confirm",
      externalCoachId,
      playerId: playerId === undefined ? null : playerId,
    }),
  });
}

/** STEP 19: скрыть кандидата (dismiss). */
export async function dismissLiveTrainingExternalCoachRecommendation(
  sessionId: string,
  recommendationId: string
): Promise<void> {
  const headers = await getCoachAuthHeaders();
  await apiFetch(`${BASE}/${encodeURIComponent(sessionId)}/external-coach-recommendations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "dismiss", recommendationId }),
  });
}

const EXTERNAL_COACH_FEEDBACK_API = "/api/live-training/external-coach-feedback";

export type LiveTrainingExternalCoachFeedbackRecord = {
  id: string;
  recommendationId: string;
  summary: string;
  focusAreas: string[];
  createdAt: string;
};

/** STEP 22: прочитать отзыв (только confirmed recommendation). */
export async function getLiveTrainingExternalCoachFeedback(
  recommendationId: string
): Promise<LiveTrainingExternalCoachFeedbackRecord | null> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<{ feedback: LiveTrainingExternalCoachFeedbackRecord | null }>(
    `${EXTERNAL_COACH_FEEDBACK_API}?recommendationId=${encodeURIComponent(recommendationId)}`,
    { method: "GET", headers }
  );
  return raw.feedback ?? null;
}

/** STEP 22: сохранить отзыв (upsert). */
export async function saveLiveTrainingExternalCoachFeedback(
  recommendationId: string,
  summary: string,
  focusAreas: string[]
): Promise<LiveTrainingExternalCoachFeedbackRecord> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<{ feedback: LiveTrainingExternalCoachFeedbackRecord }>(
    EXTERNAL_COACH_FEEDBACK_API,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ recommendationId, summary, focusAreas }),
    }
  );
  return raw.feedback;
}

export async function saveReportDraftNarrative(
  sessionId: string,
  body: LiveTrainingReportDraftNarrativePatchBody
): Promise<LiveTrainingReportDraftPayload> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<ReportDraftApiResponse>(
    `${BASE}/${encodeURIComponent(sessionId)}/report-draft`,
    { method: "PATCH", headers, body: JSON.stringify(body) }
  );
  return mapReportDraftApiResponseToPayload(raw, sessionId);
}

function mapPublishedFinalReport(raw: ReportDraftApiResponse["finalReport"]): LiveTrainingPublishedReportInfo {
  if (!raw || typeof raw !== "object" || typeof raw.trainingId !== "string") {
    throw new Error("Invalid publish response: finalReport");
  }
  return {
    trainingId: raw.trainingId,
    summary: raw.summary ?? null,
    focusAreas: raw.focusAreas ?? null,
    coachNote: raw.coachNote ?? null,
    parentMessage: raw.parentMessage ?? null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

export async function publishLiveTrainingReportDraft(sessionId: string): Promise<LiveTrainingReportDraftPublishResult> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<ReportDraftApiResponse>(
    `${BASE}/${encodeURIComponent(sessionId)}/report-draft/publish`,
    { method: "POST", headers, body: "{}" }
  );
  const base = mapReportDraftApiResponseToPayload(raw, sessionId);
  return {
    ...base,
    finalReport: mapPublishedFinalReport(raw.finalReport),
  };
}

export async function getActiveLiveTrainingSession(): Promise<LiveTrainingSession | null> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<ApiSessionRow | null>(`${BASE}/active`, { method: "GET", headers });
  if (raw == null) return null;
  return mapSession(raw);
}

export type { LiveTrainingConfirmResult };

export async function confirmLiveTrainingSession(
  sessionId: string,
  options?: { clientMutationId?: string }
): Promise<LiveTrainingConfirmResult> {
  return withLiveTrainingTransientRetry(async () => {
  const headers = await getCoachAuthHeaders();
  const bodyJson =
    options?.clientMutationId != null && String(options.clientMutationId).trim()
      ? JSON.stringify({ clientMutationId: String(options.clientMutationId).trim() })
      : "{}";
  const raw = await apiFetch<{
    session: ApiSessionRow;
    observationIds: string[];
    analytics: {
      createdSignalsCount: number;
      affectedPlayersCount: number;
      alreadyConfirmed: boolean;
    };
    outcome?: ApiOutcomeRow | null;
    priorityAlignment?: unknown;
  }>(`${BASE}/${encodeURIComponent(sessionId)}/confirm`, { method: "POST", headers, body: bodyJson });
  const session = mapSession(raw.session);
  const outcome =
    mapOutcome(raw.outcome) ??
    session.outcome ?? {
      includedDraftsCount: 0,
      excludedDraftsCount: 0,
      draftsFlaggedNeedsReview: 0,
      manualAttentionDraftsCount: 0,
      playerObservationCount: 0,
      playerLinkedObservationCount: 0,
      playerObservationUnlinkedCount: 0,
      teamObservationCount: 0,
      sessionObservationCount: 0,
      signalsCreatedCount: Number(raw.analytics?.createdSignalsCount ?? 0),
      affectedPlayersCount: Number(raw.analytics?.affectedPlayersCount ?? 0),
      positiveSignalsCount: 0,
      negativeSignalsCount: 0,
      neutralSignalsCount: 0,
      topDomains: [],
      topPlayers: [],
    };
  const priorityAlignment =
    mapPriorityAlignmentReview(raw.priorityAlignment) ??
    ({
      alignmentScore: 1,
      alignmentBand: "not_applicable" as const,
      playerCoverage: [],
      domainCoverage: [],
      reinforcementCoverage: [],
      uncoveredPlayers: [],
      uncoveredDomains: [],
      uncoveredReinforcement: [],
      explanation: ["Оценка приоритетов недоступна (старая версия сервера)."],
      computedAt: new Date().toISOString(),
      skippedNoTargets: true,
      evaluationApplied: false,
    } satisfies LiveTrainingPriorityAlignmentReview);
  return {
    session: { ...session, outcome },
    observationIds: Array.isArray(raw.observationIds) ? raw.observationIds : [],
    analytics: {
      createdSignalsCount: Number(raw.analytics?.createdSignalsCount ?? 0),
      affectedPlayersCount: Number(raw.analytics?.affectedPlayersCount ?? 0),
      alreadyConfirmed: Boolean(raw.analytics?.alreadyConfirmed),
    },
    outcome,
    priorityAlignment,
  };
  });
}

/** Событие сессии (как отдаёт GET .../events). */
export type LiveTrainingEventItem = {
  id: string;
  sessionId: string;
  sourceType: string;
  rawText: string;
  normalizedText: string | null;
  playerId: string | null;
  playerNameRaw: string | null;
  eventType: string;
  category: string | null;
  sentiment: string | null;
  confidence: number | null;
  needsReview: boolean;
  createdAt: string;
};

export type LiveTrainingIngestResponse = {
  event: LiveTrainingEventItem;
  draft: ApiDraftRow;
  matching: {
    status: "matched" | "unresolved" | "ambiguous";
    matchedPlayerId: string | null;
  };
};

export async function listLiveTrainingSessionEvents(
  sessionId: string
): Promise<LiveTrainingEventItem[]> {
  const headers = await getCoachAuthHeaders();
  const raw = await apiFetch<LiveTrainingEventItem[]>(
    `${BASE}/${encodeURIComponent(sessionId)}/events`,
    { method: "GET", headers }
  );
  return Array.isArray(raw) ? raw : [];
}

export type LiveTrainingPostSessionEventBody = {
  rawText: string;
  playerId?: string;
  playerNameRaw?: string;
  category?: string;
  sentiment?: "positive" | "negative" | "neutral";
  confidence?: number | null;
  sourceType?: "manual_stub" | "transcript_segment" | "system";
  /** Идемпотентность ingest; один и тот же id при retry/outbox */
  clientMutationId?: string;
};

export async function postLiveTrainingSessionEvent(
  sessionId: string,
  body: LiveTrainingPostSessionEventBody
): Promise<LiveTrainingIngestResponse> {
  const headers = await getCoachAuthHeaders();
  return apiFetch<LiveTrainingIngestResponse>(
    `${BASE}/${encodeURIComponent(sessionId)}/events`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }
  );
}

/** Как в `resolvePlayerFromSpeech` на сервере — для сужения списка кандидатов при ambiguous. */
export type LiveTrainingSpeechResolutionPayload =
  | { status: "not_found" }
  | { status: "ambiguous"; tier: "lastName" | "firstName" | "jerseyNumber" }
  | { status: "ok"; playerId: string };

export type LiveTrainingEventNeedsClarificationParsed = {
  reason: string;
  speechResolution?: LiveTrainingSpeechResolutionPayload;
};

/**
 * Разбор тела 422 от POST .../events (`error` + поля из `arenaRuntimeOutcomeToHttpBody`).
 * Не бросает — возвращает null, если это не needs_clarification.
 */
export function parseLiveTrainingEventNeedsClarification422Body(
  body: unknown
): LiveTrainingEventNeedsClarificationParsed | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const o = body as Record<string, unknown>;
  if (o.arenaOutcome !== "needs_clarification") return null;
  const reason =
    typeof o.reason === "string" && o.reason.trim()
      ? o.reason.trim()
      : "needs_clarification";
  const sr = o.speechResolution;
  if (sr == null || typeof sr !== "object" || Array.isArray(sr)) {
    return { reason };
  }
  const s = sr as Record<string, unknown>;
  const st = s.status;
  if (st === "not_found") {
    return { reason, speechResolution: { status: "not_found" } };
  }
  if (st === "ambiguous") {
    const tier = s.tier;
    if (tier === "lastName" || tier === "firstName" || tier === "jerseyNumber") {
      return { reason, speechResolution: { status: "ambiguous", tier } };
    }
    return { reason };
  }
  if (st === "ok" && typeof s.playerId === "string" && s.playerId.trim()) {
    return { reason, speechResolution: { status: "ok", playerId: s.playerId.trim() } };
  }
  return { reason };
}

function normalizeArenaPlayerSpeechTextCoach(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitCoachRosterDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts[0]!, lastName: parts[parts.length - 1]! };
  }
  const one = parts[0] ?? "";
  return { firstName: one, lastName: one };
}

/**
 * Кандидаты для inline-уточнения: при ambiguous — эвристика как на сервере по display name;
 * иначе весь roster. На сервере для ambiguous по номеру нужен jerseyNumber в БД — в приложении
 * часто нет номера, тогда показываем весь состав.
 */
export function buildLiveTrainingClarificationRosterCandidates(
  roster: Array<{ id: string; name: string }>,
  phrase: string,
  speechResolution: LiveTrainingSpeechResolutionPayload | undefined
): Array<{ id: string; name: string }> {
  if (roster.length === 0) return [];
  const normText = normalizeArenaPlayerSpeechTextCoach(phrase);
  if (!normText) return [...roster];

  if (!speechResolution || speechResolution.status === "not_found") {
    return [...roster];
  }

  if (speechResolution.status === "ok") {
    const row = roster.find((r) => r.id === speechResolution.playerId);
    return row ? [row] : [...roster];
  }

  if (speechResolution.status === "ambiguous") {
    if (speechResolution.tier === "lastName") {
      const hits = roster.filter((p) => {
        const { lastName } = splitCoachRosterDisplayName(p.name);
        const ln = normalizeArenaPlayerSpeechTextCoach(lastName);
        return ln.length >= 2 && normText.includes(ln);
      });
      return hits.length > 0 ? hits : [...roster];
    }
    if (speechResolution.tier === "firstName") {
      const hits = roster.filter((p) => {
        const { firstName } = splitCoachRosterDisplayName(p.name);
        const fn = normalizeArenaPlayerSpeechTextCoach(firstName);
        return fn.length >= 2 && normText.includes(fn);
      });
      return hits.length > 0 ? hits : [...roster];
    }
    /* ambiguous по номеру: в coach roster часто нет jersey — показываем весь состав */
    if (speechResolution.tier === "jerseyNumber") {
      return [...roster];
    }
  }

  return [...roster];
}

/** PHASE 15: read-only next steps по итогам сессии. */
export type LiveTrainingActionCandidate = {
  id: string;
  playerId: string | null;
  playerName: string;
  source: "live_training";
  actionType: string;
  title: string;
  body: string;
  tone: "positive" | "attention" | "neutral";
  priority: "high" | "medium" | "low";
  basedOn: {
    signalCount: number;
    domains: string[];
    lastSessionAt: string | null;
  };
  isMaterialized?: boolean;
  materializedItemId?: string | null;
};

export async function fetchLiveTrainingSessionActionCandidates(sessionId: string): Promise<{
  sessionId: string;
  items: LiveTrainingActionCandidate[];
  lowData: boolean;
}> {
  const headers = await getCoachAuthHeaders();
  return apiFetch(`${BASE}/${encodeURIComponent(sessionId)}/action-candidates`, {
    method: "GET",
    headers,
  });
}

export async function materializeLiveTrainingSessionActionCandidate(
  sessionId: string,
  candidateId: string
): Promise<{
  ok: true;
  alreadyExists: boolean;
  materializedItem: {
    id: string;
    title: string;
    status: string;
    playerId: string | null;
    createdAt: string;
  };
}> {
  const headers = await getCoachAuthHeaders();
  return apiFetch(`${BASE}/${encodeURIComponent(sessionId)}/action-candidates/materialize`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ candidateId }),
  });
}

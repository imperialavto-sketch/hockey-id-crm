/**
 * Live Training — серверная логика и Prisma (PHASE 2 persistence).
 */

import { Prisma, type LiveTrainingMode, LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findNextScheduledTrainingSlotForLiveTeam } from "./find-next-scheduled-training-slot-for-live-team";
import type { ApiUser } from "@/lib/api-auth";
import { canAccessTeam } from "@/lib/data-scope";
import { canUserAccessSessionTeam } from "@/lib/training-session-helpers";
import { buildDemoLiveTrainingDraftRows } from "./seed-demo-drafts";
import { LiveTrainingHttpError } from "./http-error";
import {
  createLiveTrainingPlayerSignalsInTransaction,
  getLiveTrainingSessionAnalyticsSummary,
} from "./live-training-player-signals";
import {
  getLiveTrainingSessionGroupContextSignalRollup,
  getLiveTrainingSessionGroupContextStampDiagnostic,
  type LiveTrainingSessionGroupContextSignalRollupDto,
  type LiveTrainingSessionGroupContextStampDiagnosticDto,
} from "./live-training-session-group-context-signal-rollup";

export { listLiveTrainingPlayerSignalsForPlayer } from "./live-training-player-signals";
import {
  ingestLiveTrainingEventTx,
  type IngestLiveTrainingEventBody,
  liveTrainingMatchingDtoFromPersistedEvent,
  type LiveTrainingIngestResultDto,
} from "./ingest-event";
import { loadLiveTrainingRosterForSessionTeam } from "./live-training-draft-mutations";
import {
  buildLiveTrainingSessionOutcomeForSession,
  type LiveTrainingSessionOutcomeDto,
} from "./live-training-session-outcome";
import {
  rehydrateMeaningDerivedFieldsOnDraftSummary,
  upsertLiveTrainingSessionReportDraft,
  type LiveTrainingSessionReportDraftDto,
  type LiveTrainingSessionReportDraftSummary,
} from "./live-training-session-report-draft";
import { upsertArenaPlannedVsObservedLiveFactForSession } from "./arena-planned-vs-observed-live-fact";
import type { SessionMeaning } from "./session-meaning";
import { augmentCoachNarrativeWithSessionMeaning } from "./session-meaning-report-merge";
import { parsePersistedSessionMeaning } from "./session-meaning";
import {
  filterDraftsByReviewListScope,
  isLiveTrainingDraftReviewException,
  type LiveTrainingReviewListScope,
} from "./live-training-review-exception";
import {
  buildLiveTrainingReportAudienceViews,
  type LiveTrainingReportAudienceViews,
} from "./live-training-report-audience-views";
import {
  listExternalCoachRecommendationsForSession,
  confirmExternalCoachRecommendation,
  dismissExternalCoachRecommendation,
  EXTERNAL_COACH_RECOMMENDATION_STATUS,
} from "@/lib/external-coach/external-coach-recommendation-service";
import {
  getExternalCoachFeedbackByRecommendationId,
  upsertExternalCoachFeedback,
  type ExternalCoachFeedbackRowDto,
} from "@/lib/external-coach/external-coach-feedback-service";
import {
  COACH_PREVIEW_NARRATIVE_META_ALL_SLOTS_TOUCHED_V1,
  coerceCoachPreviewNarrativeInSummary,
  hasPublishableCoachPreviewNarrativeV1,
  parseCoachPreviewNarrativeFromRequestBody,
} from "@/lib/live-training/report-draft/coach-preview-narrative-v1-normalize";
import { buildTrainingSessionReportPayloadFromCoachNarrative } from "./publish-live-training-session-report-draft";
import { notifyParentsOfPublishedTrainingReport } from "@/lib/notifications/notifyParentTrainingReportPublished";
import {
  buildLiveTrainingGuidanceCuesFromPlanningSnapshot,
  type LiveTrainingGuidanceCuesPayload,
} from "./build-live-training-guidance-cues";
import { buildLiveTrainingObservationContextFromSnapshot } from "./live-training-observation-context";
import {
  parseIngestProvenanceFromDb,
  type LiveTrainingIngestProvenanceDto,
} from "./live-training-ingest-provenance";
import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import type { ArenaCoachDecisionDto } from "@/lib/arena/decision/arenaCoachDecisionTypes";
import { buildArenaParentExplanation } from "@/lib/arena/parent/buildArenaParentExplanation";
import type { ArenaParentExplanation } from "@/lib/arena/parent/arenaParentExplanationTypes";
import {
  arenaCoachReviewSortRank,
  deriveArenaCoachReviewState,
  type ArenaCoachDecisionDraftSnapshot,
} from "@/lib/arena/decision/deriveArenaCoachReviewState";
import {
  buildLiveTrainingDraftCorrectionSuggestions,
  type LiveTrainingDraftCorrectionSuggestionDto,
} from "./live-training-draft-correction-suggestions";
import { composePlanningSnapshotJsonForCreate } from "./composePlanningSnapshotJsonForCreate";
import { enrichPlanningSnapshotJsonWithPreviousSessionCarry } from "./previous-session-next-actions-carry";
import {
  enrichPlanningSnapshotJsonWithConfirmedExternalCoachCarry,
  extractFocusPlayerIdsFromPlanningJson,
} from "./confirmed-external-coach-development-carry";
import {
  parsePlanningSnapshotFromDb,
  parseScheduleSlotContextBlock,
  type LiveTrainingPlanningSnapshotDto,
} from "./live-training-planning-snapshot";
import { getCanonicalTrainingSessionIdFromLiveRow } from "./resolve-live-training-to-training-session";
import { upsertTrainingSessionReportCanonicalInTransaction } from "@/lib/training-session-report-canonical-write";
import {
  buildLiveTrainingContinuityLockIn,
  fetchRecentConfirmedLiveTrainingContinuitySnapshots,
  parseLiveTrainingContinuitySnapshotFromDb,
  RECENT_CONTINUITY_HISTORY_LIMIT,
  type LiveTrainingContinuitySnapshotDto,
} from "./live-training-continuity-lock-in";
import { buildLiveTrainingCoachIntelligence } from "./liveTrainingCoachIntelligence";
import {
  computePriorityAlignmentScore,
  type LiveTrainingPriorityAlignmentReviewDto,
} from "./liveTrainingPriorityReviewScorer";
import { buildLiveTrainingQualityFrame } from "./liveTrainingQualityFrame";
import { loadArenaCrmSupercoreOperationalFocusLinesForLiveSession } from "@/lib/arena/crm/arena-crm-supercore-operational-focus";

export { LiveTrainingHttpError } from "./http-error";
export type { LiveTrainingDraftCorrectionSuggestionDto } from "./live-training-draft-correction-suggestions";
export type {
  LiveTrainingPlanningSnapshotDto,
  LiveTrainingPlanningSnapshotStartPrioritiesDto,
  LiveTrainingScheduleSlotContextDto,
} from "./live-training-planning-snapshot";
export type {
  LiveTrainingGuidanceCueDto,
  LiveTrainingGuidanceCuesPayload,
} from "./build-live-training-guidance-cues";
export type {
  LiveTrainingSessionOutcomeDto,
  LiveTrainingSessionOutcomePlayerDto,
} from "./live-training-session-outcome";
export type {
  LiveTrainingSessionReportDraftDto,
  LiveTrainingSessionReportDraftSummary,
} from "./live-training-session-report-draft";
export type { LiveTrainingContinuitySnapshotDto } from "./live-training-continuity-lock-in";
export type { LiveTrainingQualityFrameDto } from "./liveTrainingQualityFrame";
export type { LiveTrainingPriorityAlignmentReviewDto } from "./liveTrainingPriorityReviewScorer";
export type { ArenaCoachDecisionDto } from "@/lib/arena/decision/arenaCoachDecisionTypes";
export type { ArenaParentExplanation } from "@/lib/arena/parent/arenaParentExplanationTypes";
export type {
  LiveTrainingCoachView,
  LiveTrainingParentView,
  LiveTrainingReportAudienceViews,
  LiveTrainingSchoolView,
} from "./live-training-report-audience-views";

export type LiveTrainingPublishedReportInfoDto = {
  trainingId: string;
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
  updatedAt: string;
};

/** Итоговый текст из `TrainingSessionReport` для экрана тренера (read-only при ready). */
export type LiveTrainingPublishedFinalReadCoachDto = LiveTrainingPublishedReportInfoDto & {
  publishedAt: string | null;
  sessionLabel: string | null;
};

export type ExternalCoachRecommendationCoachDto = {
  id: string;
  liveSessionId: string;
  playerId: string | null;
  externalCoachId: string;
  triggerType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/** Состояние кнопки «Применить» фокуса следующей тренировки (SessionMeaning → слот расписания). */
export type ArenaNextTrainingFocusApplyStateDto = {
  /** Есть будущий слот `TrainingSession` (scheduled), куда можно записать фокус. */
  nextSlotAvailable: boolean;
  /** Уже выполнено для этой live-сессии. */
  applied: boolean;
  /** Первая строка из `sessionMeaning.nextActions.nextTrainingFocus` (если есть). */
  focusLineFromMeaning: string | null;
  /** Сохранённая строка после применения. */
  appliedFocusLine: string | null;
  targetTrainingSessionId: string | null;
  appliedAt: string | null;
};

export type LiveTrainingSessionReportDraftWithAudienceDto = {
  reportDraft: LiveTrainingSessionReportDraftDto;
  audienceViews: LiveTrainingReportAudienceViews;
  /** При `reportDraft.status === "ready"` — канонический отчёт из CRM; иначе `null`. */
  publishedFinalReport: LiveTrainingPublishedFinalReadCoachDto | null;
  /** STEP 19: состояние подбора внешних тренеров (suggestedActions.recommendedCoaches). */
  externalCoachRecommendations: ExternalCoachRecommendationCoachDto[];
  /** Фокус следующей тренировки: применение в ближайший слот расписания. */
  arenaNextTrainingFocusApply: ArenaNextTrainingFocusApplyStateDto;
  /**
   * Снимок planned focus слота на момент первого confirm (`LiveTrainingSession.plannedFocusSnapshot`).
   */
  plannedFocusSnapshot: string | null;
  /**
   * @deprecated Use `plannedFocusSnapshot` instead. Same value; backward compatibility only; will be removed later.
   */
  plannedTrainingFocus: string | null;
};

export type PublishLiveTrainingSessionReportDraftResultDto = LiveTrainingSessionReportDraftWithAudienceDto & {
  finalReport: LiveTrainingPublishedReportInfoDto;
};

export type LiveTrainingSessionAnalyticsSummaryDto = {
  signalCount: number;
  playersWithSignals: number;
  draftsWithPlayerCount: number;
};

export type LiveTrainingSessionDto = {
  id: string;
  teamId: string;
  teamName: string;
  mode: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  confirmedAt: string | null;
  /** PHASE 19: снимок planning-контекста со старта (если был передан). */
  planningSnapshot?: LiveTrainingPlanningSnapshotDto;
  /** PHASE 20: краткие подсказки по снимку (если есть непустой набор cues). */
  guidanceCues?: LiveTrainingGuidanceCuesPayload;
  /** Заполняется для status === confirmed (агрегаты по сессии). */
  analyticsSummary?: LiveTrainingSessionAnalyticsSummaryDto | null;
  /** Заполняется для status === confirmed (PHASE 10: итог для complete / refresh). */
  outcome?: LiveTrainingSessionOutcomeDto | null;
  /** PHASE 40: компактный мост в следующий старт (после confirm). */
  continuitySnapshot?: LiveTrainingContinuitySnapshotDto | null;
  /** Слот CRM, с которого стартовали live (если задан при создании). */
  trainingSessionId?: string | null;
  /** PHASE 6 Step 9: только ответ POST .../finish — выполнен авто-confirm. */
  autoFinalized?: boolean;
  /** PHASE 6 Step 11: кэш смысла сессии (read-model), обновляется после каждого успешного ingest. */
  sessionMeaningJson?: SessionMeaning | null;
  /**
   * Session-context rollup по materialized сигналам с `session_canonical_v1` (не per-player truth).
   * Только при `status === "confirmed"`; не team planned-vs-observed fact.
   */
  groupContextSignalRollup?: LiveTrainingSessionGroupContextSignalRollupDto;
  /**
   * Диагностика согласованности stamp vs пересчитанного canonical group id (re-read).
   * Только при `status === "confirmed"`.
   */
  groupContextStampDiagnostic?: LiveTrainingSessionGroupContextStampDiagnosticDto;
};

export type LiveTrainingDraftDto = {
  id: string;
  sessionId: string;
  playerId: string | null;
  playerNameRaw: string | null;
  sourceText: string;
  category: string;
  sentiment: string;
  confidence: number | null;
  needsReview: boolean;
  /** PHASE 22: сжатый снимок contextAssistant с ingest; null для старых/демо черновиков. */
  provenance: LiveTrainingIngestProvenanceDto | null;
  /** Rule-based Arena interpretation (при ingest для наблюдений с игроком); дублирует provenance.arenaInterpretation. */
  interpretation?: ArenaObservationInterpretation | null;
  /** Единая семантика review для тренера (needsReview черновика + interpretation + повторы в сессии). */
  coachDecision?: ArenaCoachDecisionDto | null;
  /** Короткое объяснение для родителя (Arena), только при наличии interpretation. */
  parentExplanation?: ArenaParentExplanation | null;
  /** PHASE 23: rule-based быстрые правки для review. */
  correctionSuggestions: LiveTrainingDraftCorrectionSuggestionDto[];
};

export type LiveTrainingReviewRosterEntryDto = {
  id: string;
  name: string;
};

export type LiveTrainingReviewSummaryDto = {
  /** Строк в текущем списке (при scope=exceptions — только «требуют внимания»). */
  toConfirmCount: number;
  needsReviewCount: number;
  unassignedCount: number;
  excludedCount: number;
  /** Все активные черновики до фильтра exceptions-first. */
  totalActiveDraftCount: number;
  /** PHASE 6: как отфильтрован ответ API. */
  reviewListScope: LiveTrainingReviewListScope;
};

export type LiveTrainingPreConfirmSummaryDto = {
  /** Уникальные игроки среди активных черновиков с playerId. */
  playersWithDraftsCount: number;
  /** До 5 игроков по числу активных черновиков. */
  topDraftPlayers: Array<{
    playerId: string;
    playerName: string;
    draftCount: number;
  }>;
};

export type LiveTrainingReviewStateDto = {
  sessionId: string;
  drafts: LiveTrainingDraftDto[];
  roster: LiveTrainingReviewRosterEntryDto[];
  reviewSummary: LiveTrainingReviewSummaryDto;
  preConfirmSummary: LiveTrainingPreConfirmSummaryDto;
  unresolvedCount: number;
  confirmedCount: number;
  groupedSummary: Array<{
    playerId: string | null;
    playerNameRaw: string | null;
    draftCount: number;
  }>;
};

export type LiveTrainingConfirmAnalyticsDto = {
  createdSignalsCount: number;
  affectedPlayersCount: number;
  alreadyConfirmed: boolean;
};

export type LiveTrainingConfirmResultDto = {
  session: LiveTrainingSessionDto;
  observationIds: string[];
  analytics: LiveTrainingConfirmAnalyticsDto;
  outcome: LiveTrainingSessionOutcomeDto;
  /** PHASE 44: соответствие подтверждённых сигналов приоритетам старта */
  priorityAlignment: LiveTrainingPriorityAlignmentReviewDto;
};

function mapSession(
  row: Prisma.LiveTrainingSessionGetPayload<{ include: { Team: { select: { name: true } } } }>
): LiveTrainingSessionDto {
  const dto: LiveTrainingSessionDto = {
    id: row.id,
    teamId: row.teamId,
    teamName: row.Team.name,
    mode: row.mode,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    ...(row.trainingSessionId != null && row.trainingSessionId !== ""
      ? { trainingSessionId: row.trainingSessionId }
      : {}),
  };
  const snap = parsePlanningSnapshotFromDb(row.planningSnapshotJson);
  if (snap) {
    dto.planningSnapshot = snap;
    const guidance = buildLiveTrainingGuidanceCuesFromPlanningSnapshot(snap);
    if (guidance.cues.length > 0) {
      dto.guidanceCues = guidance;
    }
  }
  const continuity = parseLiveTrainingContinuitySnapshotFromDb(row.continuitySnapshotJson);
  if (continuity) {
    dto.continuitySnapshot = continuity;
  }
  const sessionMeaning = parsePersistedSessionMeaning(row.sessionMeaningJson);
  if (sessionMeaning) {
    dto.sessionMeaningJson = sessionMeaning;
  }
  return dto;
}

type ConfirmedLiveTrainingSessionReadModels = {
  analyticsSummary: Awaited<ReturnType<typeof getLiveTrainingSessionAnalyticsSummary>>;
  outcome: Awaited<ReturnType<typeof buildLiveTrainingSessionOutcomeForSession>>;
  groupRollup: LiveTrainingSessionGroupContextSignalRollupDto | null;
  groupDiagnostic: LiveTrainingSessionGroupContextStampDiagnosticDto | null;
};

/** Single Promise.all for confirmed-session DTO fields (GET session, confirm response, etc.). */
async function loadConfirmedLiveTrainingSessionReadModels(
  sessionId: string
): Promise<ConfirmedLiveTrainingSessionReadModels> {
  const [analyticsSummary, outcome, groupRollup, groupDiagnostic] = await Promise.all([
    getLiveTrainingSessionAnalyticsSummary(sessionId),
    buildLiveTrainingSessionOutcomeForSession(sessionId),
    getLiveTrainingSessionGroupContextSignalRollup(sessionId),
    getLiveTrainingSessionGroupContextStampDiagnostic(sessionId),
  ]);
  return { analyticsSummary, outcome, groupRollup, groupDiagnostic };
}

function applyConfirmedReadModelsToLiveTrainingSessionDto(
  dto: LiveTrainingSessionDto,
  read: ConfirmedLiveTrainingSessionReadModels
): void {
  dto.analyticsSummary = read.analyticsSummary;
  dto.outcome = read.outcome;
  if (read.groupRollup) dto.groupContextSignalRollup = read.groupRollup;
  if (read.groupDiagnostic) dto.groupContextStampDiagnostic = read.groupDiagnostic;
}

function mapDraft(row: {
  id: string;
  sessionId: string;
  playerId: string | null;
  playerNameRaw: string | null;
  sourceText: string;
  category: string;
  sentiment: string;
  confidence: number | null;
  needsReview: boolean;
  ingestProvenanceJson?: unknown;
}): LiveTrainingDraftDto {
  const provenance = parseIngestProvenanceFromDb(row.ingestProvenanceJson);
  return {
    id: row.id,
    sessionId: row.sessionId,
    playerId: row.playerId,
    playerNameRaw: row.playerNameRaw,
    sourceText: row.sourceText,
    category: row.category,
    sentiment: row.sentiment,
    confidence: row.confidence,
    needsReview: row.needsReview,
    provenance,
    interpretation: provenance?.arenaInterpretation ?? null,
    correctionSuggestions: buildLiveTrainingDraftCorrectionSuggestions(
      {
        playerId: row.playerId,
        category: row.category,
        sentiment: row.sentiment,
        needsReview: row.needsReview,
      },
      provenance
    ),
  };
}

/** Для ответов API после PATCH и внутренних мапперов. */
export function toLiveTrainingDraftDto(row: {
  id: string;
  sessionId: string;
  playerId: string | null;
  playerNameRaw: string | null;
  sourceText: string;
  category: string;
  sentiment: string;
  confidence: number | null;
  needsReview: boolean;
  ingestProvenanceJson?: unknown;
}): LiveTrainingDraftDto {
  return mapDraft(row);
}

/**
 * PATCH ответ: пересчитать `coachDecision` в контексте всех черновиков сессии (повторы, приоритет).
 */
export async function toLiveTrainingDraftDtoWithCoachDecision(
  user: ApiUser,
  sessionId: string,
  row: Parameters<typeof mapDraft>[0]
): Promise<LiveTrainingDraftDto> {
  const sessionRow = await loadSessionForCoach(sessionId, user.id);
  if (!sessionRow) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, sessionRow.teamId);
  const draftRows = await fetchActiveObservationDraftsForSession(sessionId);
  const mapped = draftRows.map(mapDraft);
  const enriched = enrichDraftsWithCoachDecisions(mapped);
  const hit = enriched.find((d) => d.id === row.id);
  if (hit) return hit;
  const single = mapDraft(row);
  const snap = toArenaCoachDraftSnapshot(single);
  const withCoach: LiveTrainingDraftDto = {
    ...single,
    coachDecision: deriveArenaCoachReviewState(snap, [snap]),
  };
  return withParentExplanation(withCoach);
}

async function fetchActiveObservationDraftsForSession(sessionId: string) {
  return prisma.liveTrainingObservationDraft.findMany({
    where: { sessionId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

function toArenaCoachDraftSnapshot(d: LiveTrainingDraftDto): ArenaCoachDecisionDraftSnapshot {
  return {
    id: d.id,
    needsReview: d.needsReview,
    playerId: d.playerId,
    interpretation: d.interpretation ?? null,
  };
}

function withParentExplanation(d: LiveTrainingDraftDto): LiveTrainingDraftDto {
  if (!d.interpretation) return d;
  return {
    ...d,
    parentExplanation: buildArenaParentExplanation({
      interpretation: d.interpretation,
      coachDecision: d.coachDecision ?? null,
    }),
  };
}

function enrichDraftsWithCoachDecisions(drafts: LiveTrainingDraftDto[]): LiveTrainingDraftDto[] {
  const peers: ArenaCoachDecisionDraftSnapshot[] = drafts.map(toArenaCoachDraftSnapshot);
  return drafts.map((d, i) => {
    const withCoach: LiveTrainingDraftDto = {
      ...d,
      coachDecision: deriveArenaCoachReviewState(peers[i]!, peers),
    };
    return withParentExplanation(withCoach);
  });
}

/**
 * Обогащение набора черновиков одной сессии: `coachDecision` + `parentExplanation`.
 * Для батч-загрузки (CRM Arena) без N+1 вызовов `loadEnrichedLiveTrainingDraftsForSession`.
 */
export function enrichLiveTrainingDraftsWithCoachDecisions(
  drafts: LiveTrainingDraftDto[]
): LiveTrainingDraftDto[] {
  return enrichDraftsWithCoachDecisions(drafts);
}

/** Родительская сводка: активные черновики сессии с `coachDecision` и `parentExplanation`. */
export async function loadEnrichedLiveTrainingDraftsForSession(
  sessionId: string
): Promise<LiveTrainingDraftDto[]> {
  const draftRows = await fetchActiveObservationDraftsForSession(sessionId);
  return enrichDraftsWithCoachDecisions(draftRows.map(mapDraft));
}

function sortDraftsByCoachReviewOrder(
  draftRows: Awaited<ReturnType<typeof fetchActiveObservationDraftsForSession>>,
  drafts: LiveTrainingDraftDto[]
): LiveTrainingDraftDto[] {
  if (draftRows.length !== drafts.length) return drafts;
  const decorated = drafts.map((d, i) => ({
    d,
    createdAt: draftRows[i]!.createdAt.getTime(),
    rank: arenaCoachReviewSortRank(d.coachDecision!),
  }));
  decorated.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return a.createdAt - b.createdAt;
  });
  return decorated.map((x) => x.d);
}

async function loadTeamForAccess(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, schoolId: true, name: true },
  });
  return team;
}

async function assertTeamAccess(user: ApiUser, teamId: string) {
  const team = await loadTeamForAccess(teamId);
  if (!team) {
    throw new LiveTrainingHttpError("Команда не найдена", 404);
  }
  if (!canAccessTeam(user, team)) {
    throw new LiveTrainingHttpError("Нет доступа к этой команде", 403);
  }
  return team;
}

const ARENA_NEXT_FOCUS_MAX_LEN = 2000;

function resolveFirstNextTrainingFocusLineFromMeaning(
  raw: Prisma.JsonValue | null
): string | null {
  const meaning = parsePersistedSessionMeaning(raw);
  const lines = meaning?.nextActions?.nextTrainingFocus;
  if (!Array.isArray(lines)) return null;
  for (const x of lines) {
    if (typeof x !== "string") continue;
    const t = x.trim().replace(/\s+/g, " ");
    if (!t) continue;
    return t.length > ARENA_NEXT_FOCUS_MAX_LEN ? t.slice(0, ARENA_NEXT_FOCUS_MAX_LEN) : t;
  }
  return null;
}

type LiveRowArenaApplySlice = {
  sessionMeaningJson: Prisma.JsonValue | null;
  teamId: string;
  trainingSessionId: string | null;
  arenaNextFocusAppliedAt: Date | null;
  arenaNextFocusTargetTrainingSessionId: string | null;
  arenaNextFocusLine: string | null;
};

async function buildArenaNextTrainingFocusApplyStateDto(
  row: LiveRowArenaApplySlice
): Promise<ArenaNextTrainingFocusApplyStateDto> {
  const focusLineFromMeaning = resolveFirstNextTrainingFocusLineFromMeaning(row.sessionMeaningJson);
  const next = await findNextScheduledTrainingSlotForLiveTeam({
    teamId: row.teamId,
    linkedTrainingSessionId: row.trainingSessionId,
  });
  return {
    nextSlotAvailable: next != null,
    applied: row.arenaNextFocusAppliedAt != null,
    focusLineFromMeaning,
    appliedFocusLine: row.arenaNextFocusLine,
    targetTrainingSessionId: row.arenaNextFocusTargetTrainingSessionId,
    appliedAt: row.arenaNextFocusAppliedAt?.toISOString() ?? null,
  };
}

/**
 * Coach path: один раз на live-сессию (`arenaNextFocusAppliedAt`); фокус из SessionMeaning;
 * слот — {@link findNextScheduledTrainingSlotForLiveTeam}. Повторный вызов не пишет в слот снова.
 * Перезапись непустого `TrainingSession.arenaNextTrainingFocus` при первом apply не проверяется (legacy coach).
 */
export async function applyArenaNextTrainingFocusForCoach(
  user: ApiUser,
  sessionId: string
): Promise<ArenaNextTrainingFocusApplyStateDto> {
  const row = await prisma.liveTrainingSession.findFirst({
    where: { id: sessionId, coachId: user.id },
    select: {
      teamId: true,
      trainingSessionId: true,
      sessionMeaningJson: true,
      status: true,
      arenaNextFocusAppliedAt: true,
      arenaNextFocusTargetTrainingSessionId: true,
      arenaNextFocusLine: true,
    },
  });
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);
  if (row.status !== "confirmed") {
    throw new LiveTrainingHttpError(
      "Доступно только для подтверждённой живой тренировки",
      409,
      { code: "LIVE_TRAINING_SESSION_NOT_CONFIRMED" }
    );
  }
  if (row.arenaNextFocusAppliedAt) {
    return buildArenaNextTrainingFocusApplyStateDto(row);
  }
  const focusLine = resolveFirstNextTrainingFocusLineFromMeaning(row.sessionMeaningJson);
  if (!focusLine) {
    throw new LiveTrainingHttpError("Нет фокуса следующей тренировки в смысле сессии", 400, {
      code: "ARENA_NEXT_FOCUS_EMPTY",
    });
  }
  const nextSlot = await findNextScheduledTrainingSlotForLiveTeam({
    teamId: row.teamId,
    linkedTrainingSessionId: row.trainingSessionId,
  });
  if (!nextSlot) {
    throw new LiveTrainingHttpError("Нет следующей тренировки в расписании", 409, {
      code: "ARENA_NEXT_FOCUS_NO_SLOT",
    });
  }
  await prisma.$transaction(async (tx) => {
    const slot = await tx.trainingSession.findFirst({
      where: { id: nextSlot.id, teamId: row.teamId, status: "scheduled" },
      select: { id: true },
    });
    if (!slot) {
      throw new LiveTrainingHttpError("Слот расписания недоступен", 409, {
        code: "ARENA_NEXT_FOCUS_SLOT_GONE",
      });
    }
    await tx.trainingSession.update({
      where: { id: slot.id },
      data: { arenaNextTrainingFocus: focusLine },
    });
    await tx.liveTrainingSession.update({
      where: { id: sessionId },
      data: {
        arenaNextFocusAppliedAt: new Date(),
        arenaNextFocusTargetTrainingSessionId: slot.id,
        arenaNextFocusLine: focusLine,
      },
    });
  });
  const after = await prisma.liveTrainingSession.findFirst({
    where: { id: sessionId, coachId: user.id },
    select: {
      sessionMeaningJson: true,
      teamId: true,
      trainingSessionId: true,
      arenaNextFocusAppliedAt: true,
      arenaNextFocusTargetTrainingSessionId: true,
      arenaNextFocusLine: true,
    },
  });
  if (!after) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  return buildArenaNextTrainingFocusApplyStateDto(after);
}

function sanitizeExplicitArenaNextFocusLine(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.length > ARENA_NEXT_FOCUS_MAX_LEN ? t.slice(0, ARENA_NEXT_FOCUS_MAX_LEN) : t;
}

function isArenaNextTrainingFocusSlotOccupied(raw: string | null | undefined): boolean {
  return Boolean(String(raw ?? "").trim());
}

/**
 * CRM explicit path: текст фокуса на выбранный будущий слот. Повторные вызовы разрешены;
 * непустой `arenaNextTrainingFocus` перезаписывается только при `explicitOverwrite` (ручное намерение).
 * Будущий auto-apply: `explicitOverwrite: false` — запись только если слот пустой.
 */
export async function applyArenaNextTrainingFocusForCrmWithExplicitTarget(
  user: ApiUser,
  liveTrainingSessionId: string,
  targetTrainingSessionId: string,
  focusLineRaw: string,
  explicitOverwrite: boolean
): Promise<ArenaNextTrainingFocusApplyStateDto> {
  const focusLine = sanitizeExplicitArenaNextFocusLine(focusLineRaw);
  if (!focusLine) {
    throw new LiveTrainingHttpError("Пустой или некорректный фокус", 400, {
      code: "ARENA_NEXT_FOCUS_EMPTY",
    });
  }

  const live = await prisma.liveTrainingSession.findFirst({
    where: { id: liveTrainingSessionId },
    select: {
      id: true,
      teamId: true,
      status: true,
      trainingSessionId: true,
      sessionMeaningJson: true,
      arenaNextFocusAppliedAt: true,
      arenaNextFocusTargetTrainingSessionId: true,
      arenaNextFocusLine: true,
    },
  });
  if (!live) {
    throw new LiveTrainingHttpError("Live-сессия не найдена", 404);
  }
  await assertTeamAccess(user, live.teamId);
  if (live.status !== "confirmed") {
    throw new LiveTrainingHttpError(
      "Доступно только для подтверждённой живой тренировки",
      409,
      { code: "LIVE_TRAINING_SESSION_NOT_CONFIRMED" }
    );
  }

  const target = await prisma.trainingSession.findFirst({
    where: { id: targetTrainingSessionId, teamId: live.teamId },
    select: {
      id: true,
      teamId: true,
      status: true,
      startAt: true,
      arenaNextTrainingFocus: true,
      team: { select: { schoolId: true } },
    },
  });
  if (!target) {
    throw new LiveTrainingHttpError("Слот расписания не найден", 404);
  }
  if (
    !canUserAccessSessionTeam(user, {
      teamId: target.teamId,
      team: { schoolId: target.team.schoolId },
    })
  ) {
    throw new LiveTrainingHttpError("Нет доступа к слоту", 403);
  }
  if (target.status !== "scheduled") {
    throw new LiveTrainingHttpError("Слот не в статусе scheduled", 409, {
      code: "ARENA_NEXT_FOCUS_SLOT_NOT_SCHEDULED",
    });
  }
  if (target.startAt.getTime() <= Date.now()) {
    throw new LiveTrainingHttpError("Выберите будущий слот расписания", 409, {
      code: "ARENA_NEXT_FOCUS_SLOT_PAST",
    });
  }

  if (isArenaNextTrainingFocusSlotOccupied(target.arenaNextTrainingFocus) && !explicitOverwrite) {
    throw new LiveTrainingHttpError(
      "В слоте уже указан фокус тренировки. Для замены укажите explicitOverwrite: true (ручное действие CRM).",
      409,
      { code: "ARENA_NEXT_FOCUS_SLOT_OCCUPIED" }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.trainingSession.update({
      where: { id: target.id },
      data: { arenaNextTrainingFocus: focusLine },
    });
    await tx.liveTrainingSession.update({
      where: { id: live.id },
      data: {
        arenaNextFocusAppliedAt: new Date(),
        arenaNextFocusTargetTrainingSessionId: target.id,
        arenaNextFocusLine: focusLine,
      },
    });
  });

  const after = await prisma.liveTrainingSession.findFirst({
    where: { id: liveTrainingSessionId },
    select: {
      sessionMeaningJson: true,
      teamId: true,
      trainingSessionId: true,
      arenaNextFocusAppliedAt: true,
      arenaNextFocusTargetTrainingSessionId: true,
      arenaNextFocusLine: true,
    },
  });
  if (!after) {
    throw new LiveTrainingHttpError("Live-сессия не найдена", 404);
  }
  return buildArenaNextTrainingFocusApplyStateDto(after);
}

async function loadSessionForCoach(sessionId: string, coachId: string) {
  return prisma.liveTrainingSession.findFirst({
    where: { id: sessionId, coachId },
    include: { Team: { select: { name: true } } },
  });
}

/**
 * CRM-слот для канонического `TrainingSessionReport` — через {@link getCanonicalTrainingSessionIdFromLiveRow}.
 */
function resolveLinkedTrainingSessionIdForLivePublish(row: {
  planningSnapshotJson: Prisma.JsonValue | null;
  trainingSessionId: string | null;
}): string {
  return (
    getCanonicalTrainingSessionIdFromLiveRow({
      trainingSessionId: row.trainingSessionId,
      planningSnapshotJson: row.planningSnapshotJson,
    }) ?? ""
  );
}

export type LiveTrainingEventDto = {
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

function mapEvent(row: {
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
  createdAt: Date;
}): LiveTrainingEventDto {
  return {
    id: row.id,
    sessionId: row.sessionId,
    sourceType: row.sourceType,
    rawText: row.rawText,
    normalizedText: row.normalizedText,
    playerId: row.playerId,
    playerNameRaw: row.playerNameRaw,
    eventType: row.eventType,
    category: row.category,
    sentiment: row.sentiment,
    confidence: row.confidence,
    needsReview: row.needsReview,
    createdAt: row.createdAt.toISOString(),
  };
}

const ACTIVE_STATUSES: LiveTrainingSessionStatus[] = ["live", "review"];

/**
 * Каноническая привязка к `TrainingSession.id` при старте live.
 * - Ad-hoc (нет слота в теле) → `null`.
 * - Если передан `trainingSlotId` (явно или в scheduleSlotContext) → обязательна валидная строка
 *   `TrainingSession` той же команды; иначе 400 (не пишем «висящий» id в snapshot без FK).
 * - Явный `trainingSessionId` и `scheduleSlotContext.trainingSlotId` не должны расходиться.
 */
async function resolveAndAssertCanonicalTrainingSessionIdForLiveCreate(
  teamId: string,
  explicitTrainingSessionId: string | null | undefined,
  scheduleSlotContext: unknown
): Promise<string | null> {
  const explicit =
    typeof explicitTrainingSessionId === "string" && explicitTrainingSessionId.trim()
      ? explicitTrainingSessionId.trim()
      : null;
  const slot = parseScheduleSlotContextBlock(
    scheduleSlotContext != null && typeof scheduleSlotContext === "object" && !Array.isArray(scheduleSlotContext)
      ? scheduleSlotContext
      : null,
    teamId
  );
  const fromSlot = slot?.trainingSlotId?.trim() || null;

  if (explicit && fromSlot && explicit !== fromSlot) {
    throw new LiveTrainingHttpError(
      "Разные идентификаторы слота: trainingSessionId и scheduleSlotContext.trainingSlotId",
      400,
      { code: "TRAINING_SESSION_SLOT_MISMATCH" }
    );
  }

  const candidate = explicit ?? fromSlot;
  if (!candidate) return null;

  const ts = await prisma.trainingSession.findUnique({
    where: { id: candidate },
    select: { id: true, teamId: true },
  });
  if (!ts || ts.teamId !== teamId) {
    throw new LiveTrainingHttpError(
      "Слот расписания не найден или не относится к выбранной команде",
      400,
      { code: "INVALID_TRAINING_SESSION_SLOT", trainingSessionId: candidate }
    );
  }
  return ts.id;
}

/** Post-link: подтверждение — добить FK из уже сохранённого planningSnapshotJson (старые клиенты / миграции). */
async function tryResolveTrainingSessionIdFromStoredPlanning(
  teamId: string,
  planningSnapshotJson: Prisma.JsonValue | null
): Promise<string | null> {
  const slotId =
    getCanonicalTrainingSessionIdFromLiveRow({
      trainingSessionId: null,
      planningSnapshotJson,
    }) ?? "";
  if (!slotId) return null;
  const ts = await prisma.trainingSession.findUnique({
    where: { id: slotId },
    select: { id: true, teamId: true },
  });
  if (!ts || ts.teamId !== teamId) return null;
  return ts.id;
}

export async function createLiveTrainingSession(
  user: ApiUser,
  input: {
    teamId: string;
    mode: LiveTrainingMode;
    groupId?: string | null;
    /** Явный id слота CRM; дублирует `scheduleSlotContext.trainingSlotId`, если клиент шлёт оба. */
    trainingSessionId?: string | null;
    planningSnapshot?: unknown;
    scheduleSlotContext?: unknown;
  }
): Promise<LiveTrainingSessionDto> {
  await assertTeamAccess(user, input.teamId);

  const snapshotJson = composePlanningSnapshotJsonForCreate({
    teamId: input.teamId,
    groupId: input.groupId,
    planningSnapshot: input.planningSnapshot,
    scheduleSlotContext: input.scheduleSlotContext,
  });
  let planningSnapshotJson = await enrichPlanningSnapshotJsonWithPreviousSessionCarry(
    input.teamId,
    user.id,
    snapshotJson
  );
  const focusPlayerIds = extractFocusPlayerIdsFromPlanningJson(planningSnapshotJson);
  planningSnapshotJson = await enrichPlanningSnapshotJsonWithConfirmedExternalCoachCarry(
    input.teamId,
    planningSnapshotJson,
    focusPlayerIds
  );

  const trainingSessionId = await resolveAndAssertCanonicalTrainingSessionIdForLiveCreate(
    input.teamId,
    input.trainingSessionId,
    input.scheduleSlotContext
  );

  const existing = await prisma.liveTrainingSession.findFirst({
    where: {
      coachId: user.id,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (existing) {
    throw new LiveTrainingHttpError("Уже есть активная или неподтверждённая живая тренировка", 409, {
      sessionId: existing.id,
    });
  }

  const row = await prisma.liveTrainingSession.create({
    data: {
      coachId: user.id,
      teamId: input.teamId,
      mode: input.mode,
      status: "live",
      planningSnapshotJson,
      ...(trainingSessionId ? { trainingSessionId } : {}),
    },
    include: { Team: { select: { name: true } } },
  });
  return mapSession(row);
}

export async function getActiveLiveTrainingSessionForCoach(
  user: ApiUser
): Promise<LiveTrainingSessionDto | null> {
  const row = await prisma.liveTrainingSession.findFirst({
    where: {
      coachId: user.id,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
    include: { Team: { select: { name: true } } },
  });
  return row ? mapSession(row) : null;
}

export async function getLiveTrainingSessionByIdForCoach(
  user: ApiUser,
  sessionId: string
): Promise<LiveTrainingSessionDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);
  const dto = mapSession(row);
  if (row.status === LiveTrainingSessionStatus.confirmed) {
    const read = await loadConfirmedLiveTrainingSessionReadModels(sessionId);
    applyConfirmedReadModelsToLiveTrainingSessionDto(dto, read);
  }
  return dto;
}

/**
 * PHASE 6 Step 9: авто-finalize после finish — те же правила, что exceptions-first review (без публикации).
 */
async function shouldAutoFinalizeSession(sessionId: string): Promise<boolean> {
  const session = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    select: { status: true },
  });
  if (!session || session.status !== "review") return false;

  const [draftRows, eventCount] = await Promise.all([
    fetchActiveObservationDraftsForSession(sessionId),
    prisma.liveTrainingEvent.count({ where: { sessionId } }),
  ]);

  if (draftRows.length === 0 && eventCount === 0) return false;

  if (draftRows.length > 0) {
    const mapped = draftRows.map(mapDraft);
    const enriched = enrichDraftsWithCoachDecisions(mapped);
    for (const d of enriched) {
      if (isLiveTrainingDraftReviewException(d)) return false;
    }
  }

  return draftRows.length > 0 || eventCount > 0;
}

export async function finishLiveTrainingSession(
  user: ApiUser,
  sessionId: string
): Promise<LiveTrainingSessionDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  if (row.status === "confirmed" || row.status === "cancelled") {
    throw new LiveTrainingHttpError("Сессию нельзя завершить в текущем статусе", 400);
  }
  if (row.status === "review") {
    return { ...mapSession(row), autoFinalized: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.liveTrainingSession.update({
      where: { id: sessionId },
      data: {
        status: "review",
        endedAt: new Date(),
      },
    });
    const count = await tx.liveTrainingObservationDraft.count({
      where: { sessionId, deletedAt: null },
    });
    /** Fallback: demo drafts только если за время live ничего не накопилось (см. seed-demo-drafts.ts). */
    if (count === 0) {
      await tx.liveTrainingObservationDraft.createMany({
        data: buildDemoLiveTrainingDraftRows(sessionId),
      });
    }
  });

  const updated = await loadSessionForCoach(sessionId, user.id);
  if (!updated) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }

  if (!(await shouldAutoFinalizeSession(sessionId))) {
    return { ...mapSession(updated), autoFinalized: false };
  }

  try {
    const confirmResult = await confirmLiveTrainingSession(user, sessionId);
    return { ...confirmResult.session, autoFinalized: true };
  } catch (e) {
    console.error("[live-training] auto finalize after finish failed:", sessionId, e);
    const again = await loadSessionForCoach(sessionId, user.id);
    if (!again) {
      throw new LiveTrainingHttpError("Сессия не найдена", 404);
    }
    return { ...mapSession(again), autoFinalized: false };
  }
}

export async function listLiveTrainingDrafts(
  user: ApiUser,
  sessionId: string,
  options?: { reviewListScope?: LiveTrainingReviewListScope }
): Promise<LiveTrainingDraftDto[]> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  const rows = await fetchActiveObservationDraftsForSession(sessionId);
  const mapped = rows.map(mapDraft);
  const enriched = enrichDraftsWithCoachDecisions(mapped);
  const sorted = sortDraftsByCoachReviewOrder(rows, enriched);
  const scope: LiveTrainingReviewListScope = options?.reviewListScope ?? "exceptions";
  return filterDraftsByReviewListScope(sorted, scope);
}

export async function getLiveTrainingReviewState(
  user: ApiUser,
  sessionId: string,
  options?: { reviewListScope?: LiveTrainingReviewListScope }
): Promise<LiveTrainingReviewStateDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);

  const reviewListScope: LiveTrainingReviewListScope = options?.reviewListScope ?? "exceptions";

  const [draftRows, excludedCount, roster] = await Promise.all([
    fetchActiveObservationDraftsForSession(sessionId),
    prisma.liveTrainingObservationDraft.count({
      where: { sessionId, deletedAt: { not: null } },
    }),
    loadLiveTrainingRosterForSessionTeam(row.teamId),
  ]);

  const mappedDrafts = draftRows.map(mapDraft);
  const enrichedDrafts = enrichDraftsWithCoachDecisions(mappedDrafts);
  /**
   * Приоритизация для review: детерминированный порядок по `coachDecision` (см. arenaCoachReviewSortRank).
   * Исходный порядок `createdAt` сохраняется как tie-breaker.
   */
  const sortedFull = sortDraftsByCoachReviewOrder(draftRows, enrichedDrafts);
  const drafts = filterDraftsByReviewListScope(sortedFull, reviewListScope);
  const unresolvedCount = drafts.filter((d) => d.needsReview).length;
  const confirmedCount = drafts.filter((d) => !d.needsReview).length;
  const needsReviewCount = unresolvedCount;
  const unassignedCount = drafts.filter((d) => !d.playerId).length;
  const reviewSummary: LiveTrainingReviewSummaryDto = {
    toConfirmCount: drafts.length,
    needsReviewCount,
    unassignedCount,
    excludedCount,
    totalActiveDraftCount: sortedFull.length,
    reviewListScope,
  };

  const rosterById = new Map(roster.map((r) => [r.id, r.name]));
  const playerDraftCounts = new Map<string, number>();
  for (const d of drafts) {
    if (d.playerId) {
      playerDraftCounts.set(d.playerId, (playerDraftCounts.get(d.playerId) ?? 0) + 1);
    }
  }
  const topDraftPlayers = [...playerDraftCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([playerId, draftCount]) => ({
      playerId,
      playerName: rosterById.get(playerId)?.trim() || "Игрок",
      draftCount,
    }));
  const preConfirmSummary: LiveTrainingPreConfirmSummaryDto = {
    playersWithDraftsCount: playerDraftCounts.size,
    topDraftPlayers,
  };

  const groupMap = new Map<
    string,
    { playerId: string | null; playerNameRaw: string | null; draftCount: number }
  >();
  for (const d of drafts) {
    const key = d.playerId ?? `__none__${d.playerNameRaw ?? ""}`;
    const cur = groupMap.get(key);
    if (cur) {
      cur.draftCount += 1;
    } else {
      groupMap.set(key, {
        playerId: d.playerId,
        playerNameRaw: d.playerNameRaw,
        draftCount: 1,
      });
    }
  }

  return {
    sessionId,
    drafts,
    roster,
    reviewSummary,
    preConfirmSummary,
    unresolvedCount,
    confirmedCount,
    groupedSummary: Array.from(groupMap.values()),
  };
}

/**
 * Однократный снимок `TrainingSession.arenaNextTrainingFocus` для связанного слота при первом confirm.
 * Не перезаписывает непустое значение; ошибки БД — warn, без прерывания confirm.
 */
async function snapshotPlannedFocusOnLiveConfirmIfNeeded(
  teamId: string,
  liveSessionId: string,
  trainingSessionId: string | null | undefined
): Promise<void> {
  const linkId = trainingSessionId?.trim();
  if (!linkId) return;
  try {
    const live = await prisma.liveTrainingSession.findFirst({
      where: { id: liveSessionId, teamId },
      select: { plannedFocusSnapshot: true },
    });
    if (live?.plannedFocusSnapshot != null && String(live.plannedFocusSnapshot).trim() !== "") {
      return;
    }
    const slot = await prisma.trainingSession.findFirst({
      where: { id: linkId, teamId },
      select: { arenaNextTrainingFocus: true },
    });
    const focus = slot?.arenaNextTrainingFocus?.trim();
    if (!focus) return;
    await prisma.liveTrainingSession.update({
      where: { id: liveSessionId },
      data: { plannedFocusSnapshot: focus },
    });
  } catch (e) {
    console.warn("[live-training] plannedFocusSnapshot on confirm: skipped", liveSessionId, e);
  }
}

/**
 * Safe auto-apply MVP: только из {@link confirmLiveTrainingSession} при первом переходе в `confirmed`.
 * Первая строка supercore operational focus → канонический next slot; `explicitOverwrite: false` (empty-only).
 * Повторный confirm не трогает (`alreadyConfirmed`). Уже установленный `arenaNextFocusAppliedAt` — пропуск
 * (coach/manual/auto уже связали слот). Бизнес-отказы — тихий no-op + `console.warn`.
 */
async function trySafeAutoApplyArenaNextFocusAfterLiveConfirm(
  user: ApiUser,
  sessionId: string
): Promise<void> {
  try {
    const lines = await loadArenaCrmSupercoreOperationalFocusLinesForLiveSession(sessionId);
    const first = lines[0];
    if (!first) return;

    const focusLineRaw = [first.title, first.body]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" — ");
    const focusLine = sanitizeExplicitArenaNextFocusLine(focusLineRaw);
    if (!focusLine) return;

    const liveRow = await prisma.liveTrainingSession.findFirst({
      where: { id: sessionId },
      select: {
        teamId: true,
        status: true,
        trainingSessionId: true,
        arenaNextFocusAppliedAt: true,
      },
    });
    if (!liveRow || liveRow.status !== LiveTrainingSessionStatus.confirmed) return;
    if (liveRow.arenaNextFocusAppliedAt != null) return;

    await assertTeamAccess(user, liveRow.teamId);

    const nextSlot = await findNextScheduledTrainingSlotForLiveTeam({
      teamId: liveRow.teamId,
      linkedTrainingSessionId: liveRow.trainingSessionId,
    });
    if (!nextSlot) return;

    await applyArenaNextTrainingFocusForCrmWithExplicitTarget(
      user,
      sessionId,
      nextSlot.id,
      focusLine,
      false
    );
  } catch (e) {
    if (e instanceof LiveTrainingHttpError) {
      console.warn(
        "[live-training] safe auto-apply Arena next focus: no-op",
        sessionId,
        e.message,
        e.body ?? {}
      );
      return;
    }
    console.error("[live-training] safe auto-apply Arena next focus: unexpected", sessionId, e);
  }
}

/**
 * Подтверждение сессии: создание аналитических сигналов по-прежнему от модели черновика (`needsReview`, категория и т.д.).
 * `coachDecision` на черновиках — read-model для review API; при необходимости confirm можно расширить позже без ломки контракта.
 *
 * При **первом** переходе в `confirmed` дополнительно: снимок planned focus слота в `plannedFocusSnapshot`
 * (см. {@link snapshotPlannedFocusOnLiveConfirmIfNeeded}) и safe auto-apply Arena next focus;
 * см. {@link trySafeAutoApplyArenaNextFocusAfterLiveConfirm}.
 */
export async function confirmLiveTrainingSession(
  user: ApiUser,
  sessionId: string
): Promise<LiveTrainingConfirmResultDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  if (row.status === "cancelled") {
    throw new LiveTrainingHttpError("Сессия отменена", 400);
  }
  if (row.status === "live") {
    throw new LiveTrainingHttpError("Сначала завершите тренировку", 400);
  }

  await assertTeamAccess(user, row.teamId);

  const alreadyConfirmed = row.status === "confirmed";

  const signalResult = await prisma.$transaction(async (tx) => {
    if (!alreadyConfirmed) {
      let linkId = row.trainingSessionId?.trim() || null;
      if (!linkId) {
        linkId = await tryResolveTrainingSessionIdFromStoredPlanning(
          row.teamId,
          row.planningSnapshotJson
        );
      }
      await tx.liveTrainingSession.update({
        where: { id: sessionId },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          ...(linkId ? { trainingSessionId: linkId } : {}),
        },
      });
    }
    return createLiveTrainingPlayerSignalsInTransaction(tx, {
      sessionId,
      coachId: row.coachId,
      teamId: row.teamId,
    });
  });

  const drafts = await prisma.liveTrainingObservationDraft.findMany({
    where: { sessionId, deletedAt: null },
    select: { id: true },
  });

  const updated = await loadSessionForCoach(sessionId, user.id);
  if (!updated) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }

  if (!alreadyConfirmed) {
    await snapshotPlannedFocusOnLiveConfirmIfNeeded(
      updated.teamId,
      sessionId,
      updated.trainingSessionId
    );
  }

  const { analyticsSummary, outcome, groupRollup, groupDiagnostic } =
    await loadConfirmedLiveTrainingSessionReadModels(sessionId);

  await upsertLiveTrainingSessionReportDraft(sessionId);

  try {
    await upsertArenaPlannedVsObservedLiveFactForSession(sessionId);
  } catch (e) {
    console.warn("[live-training] arena planned-vs-observed fact upsert skipped", sessionId, e);
  }

  const planningSnap = parsePlanningSnapshotFromDb(updated.planningSnapshotJson);

  const signalRows = await prisma.liveTrainingPlayerSignal.findMany({
    where: { liveTrainingSessionId: sessionId },
    select: { playerId: true, metricDomain: true },
  });

  const priorityAlignment = computePriorityAlignmentScore({
    planningSnapshot: planningSnap,
    confirmedObservations: signalRows,
  });

  const continuitySnapshot = buildLiveTrainingContinuityLockIn({
    teamId: updated.teamId,
    generatedAt: new Date(),
    outcome,
  });

  const draftContinuity: LiveTrainingContinuitySnapshotDto = {
    ...continuitySnapshot,
    priorityAlignmentReview: priorityAlignment,
  };

  const recentContinuity = await fetchRecentConfirmedLiveTrainingContinuitySnapshots(
    updated.teamId,
    updated.coachId,
    RECENT_CONTINUITY_HISTORY_LIMIT
  );

  const playerNameRows = await prisma.player.findMany({
    where: { teamId: updated.teamId },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameByIdForIntel = new Map(
    playerNameRows.map((p) => [
      p.id,
      [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || "Игрок",
    ])
  );

  const historyForCoachIntel = [draftContinuity, ...recentContinuity].slice(
    0,
    RECENT_CONTINUITY_HISTORY_LIMIT
  );
  const coachIntelligenceAtConfirm = buildLiveTrainingCoachIntelligence({
    recentContinuitySnapshots: historyForCoachIntel,
    nameById: nameByIdForIntel,
  });

  const trainingQualityFrame = buildLiveTrainingQualityFrame({
    priorityAlignment,
    coachIntelligence: coachIntelligenceAtConfirm,
  });

  const continuityPayload: LiveTrainingContinuitySnapshotDto = {
    ...draftContinuity,
    trainingQualityFrame,
  };

  await prisma.liveTrainingSession.update({
    where: { id: sessionId },
    data: { continuitySnapshotJson: continuityPayload as object },
  });

  const finalRow = await loadSessionForCoach(sessionId, user.id);
  if (!finalRow) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }

  if (!alreadyConfirmed) {
    await trySafeAutoApplyArenaNextFocusAfterLiveConfirm(user, sessionId);
  }

  return {
    session: {
      ...mapSession(finalRow),
      analyticsSummary,
      outcome,
      ...(groupRollup ? { groupContextSignalRollup: groupRollup } : {}),
      ...(groupDiagnostic ? { groupContextStampDiagnostic: groupDiagnostic } : {}),
    },
    observationIds: drafts.map((d) => d.id),
    analytics: {
      createdSignalsCount: signalResult.createdSignalsCount,
      affectedPlayersCount: signalResult.affectedPlayersCount,
      alreadyConfirmed,
    },
    outcome,
    priorityAlignment,
  };
}

/** P2002 только по @@unique([sessionId, clientMutationId]) на LiveTrainingEvent. */
function isP2002LiveTrainingEventSessionClientMutationId(e: unknown): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") {
    return false;
  }
  const target = e.meta?.target;
  if (!Array.isArray(target)) return false;
  const names = new Set(target.map((x) => String(x)));
  return names.has("sessionId") && names.has("clientMutationId");
}

function mapPersistedLiveTrainingIngestToResult(
  ev: {
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
    createdAt: Date;
  },
  dr: {
    id: string;
    sessionId: string;
    playerId: string | null;
    playerNameRaw: string | null;
    sourceText: string;
    category: string;
    sentiment: string;
    confidence: number | null;
    needsReview: boolean;
  }
): LiveTrainingIngestResultDto {
  return {
    event: {
      id: ev.id,
      sessionId: ev.sessionId,
      sourceType: ev.sourceType,
      rawText: ev.rawText,
      normalizedText: ev.normalizedText,
      playerId: ev.playerId,
      playerNameRaw: ev.playerNameRaw,
      eventType: ev.eventType,
      category: ev.category,
      sentiment: ev.sentiment,
      confidence: ev.confidence,
      needsReview: ev.needsReview,
      createdAt: ev.createdAt.toISOString(),
    },
    draft: {
      id: dr.id,
      sessionId: dr.sessionId,
      playerId: dr.playerId,
      playerNameRaw: dr.playerNameRaw,
      sourceText: dr.sourceText,
      category: dr.category,
      sentiment: dr.sentiment,
      confidence: dr.confidence,
      needsReview: dr.needsReview,
    },
    matching: liveTrainingMatchingDtoFromPersistedEvent(ev),
  };
}

export async function ingestLiveTrainingEventForCoach(
  user: ApiUser,
  sessionId: string,
  body: IngestLiveTrainingEventBody
): Promise<LiveTrainingIngestResultDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  /**
   * Статус `live` — единственное server-side «окно времени» для ingest. Отложенная отправка из
   * coach outbox (`liveTrainingEventOutbox`) валидна, пока сессия ещё `live`; после перехода в
   * review/finish те же тела получат 400 — это ожидаемо, не баг сетевой задержки.
   */
  if (row.status !== "live") {
    throw new LiveTrainingHttpError(
      "События можно добавлять только во время активной тренировки",
      400
    );
  }
  await assertTeamAccess(user, row.teamId);

  const mid = typeof body.clientMutationId === "string" ? body.clientMutationId.trim() : "";
  if (mid) {
    const existingEvent = await prisma.liveTrainingEvent.findFirst({
      where: { sessionId, clientMutationId: mid },
    });
    if (existingEvent) {
      const dr = await prisma.liveTrainingObservationDraft.findFirst({
        where: { liveTrainingEventId: existingEvent.id },
      });
      if (!dr) {
        throw new LiveTrainingHttpError(
          "Событие с этим clientMutationId уже есть, но связанный черновик не найден.",
          500
        );
      }
      return mapPersistedLiveTrainingIngestToResult(
        {
          ...existingEvent,
          sourceType: String(existingEvent.sourceType),
          sentiment: existingEvent.sentiment != null ? String(existingEvent.sentiment) : null,
        },
        {
          ...dr,
          sentiment: String(dr.sentiment),
        }
      );
    }
  }

  const snap = parsePlanningSnapshotFromDb(row.planningSnapshotJson);
  const observationContext = buildLiveTrainingObservationContextFromSnapshot(snap);
  try {
    return await ingestLiveTrainingEventTx({
      sessionId,
      teamId: row.teamId,
      body,
      observationContext,
    });
  } catch (e) {
    if (mid && isP2002LiveTrainingEventSessionClientMutationId(e)) {
      const winner = await prisma.liveTrainingEvent.findFirst({
        where: { sessionId, clientMutationId: mid },
      });
      if (winner) {
        const dr = await prisma.liveTrainingObservationDraft.findFirst({
          where: { liveTrainingEventId: winner.id },
        });
        if (!dr) {
          throw new LiveTrainingHttpError(
            "Событие с этим clientMutationId уже есть, но связанный черновик не найден.",
            500
          );
        }
        return mapPersistedLiveTrainingIngestToResult(
          {
            ...winner,
            sourceType: String(winner.sourceType),
            sentiment: winner.sentiment != null ? String(winner.sentiment) : null,
          },
          {
            ...dr,
            sentiment: String(dr.sentiment),
          }
        );
      }
    }
    throw e;
  }
}

export async function listLiveTrainingEventsForCoach(
  user: ApiUser,
  sessionId: string
): Promise<LiveTrainingEventDto[]> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);

  const events = await prisma.liveTrainingEvent.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return events.map(mapEvent);
}

async function loadPublishedFinalReadForCoach(
  user: ApiUser,
  row: NonNullable<Awaited<ReturnType<typeof loadSessionForCoach>>>,
  draft: { status: string; publishedAt: Date | null }
): Promise<LiveTrainingPublishedFinalReadCoachDto | null> {
  if (draft.status !== "ready") return null;
  const trainingId = resolveLinkedTrainingSessionIdForLivePublish(row);
  if (!trainingId) return null;

  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id: trainingId },
    include: {
      team: { select: { name: true, schoolId: true } },
      sessionReport: true,
    },
  });
  if (!trainingSession || trainingSession.teamId !== row.teamId) return null;
  if (!canUserAccessSessionTeam(user, trainingSession)) return null;

  const rep = trainingSession.sessionReport;
  const sub = trainingSession.subType?.trim();
  const kind = String(trainingSession.type).toLowerCase() === "ofp" ? "ОФП" : "Лёд";
  const kindLabel = sub ? `${kind} · ${sub}` : kind;
  const dateLabel = trainingSession.startAt.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const teamName = trainingSession.team?.name?.trim() ?? "";
  const sessionLabel = [dateLabel, teamName, kindLabel].filter(Boolean).join(" · ");

  return {
    trainingId,
    summary: rep?.summary ?? null,
    focusAreas: rep?.focusAreas ?? null,
    coachNote: rep?.coachNote ?? null,
    parentMessage: rep?.parentMessage ?? null,
    updatedAt: rep?.updatedAt.toISOString() ?? trainingSession.updatedAt.toISOString(),
    publishedAt: draft.publishedAt?.toISOString() ?? null,
    sessionLabel: sessionLabel || null,
  };
}

export async function getLiveTrainingSessionReportDraftForCoach(
  user: ApiUser,
  sessionId: string
): Promise<LiveTrainingSessionReportDraftWithAudienceDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);
  if (row.status !== "confirmed") {
    throw new LiveTrainingHttpError(
      "Черновик отчёта доступен только для подтверждённой тренировки",
      409,
      { code: "LIVE_TRAINING_SESSION_NOT_CONFIRMED" }
    );
  }

  const draft = await prisma.liveTrainingSessionReportDraft.findUnique({
    where: { liveTrainingSessionId: sessionId },
  });
  if (!draft) {
    throw new LiveTrainingHttpError(
      "Черновик отчёта не найден. Он создаётся при подтверждении живой тренировки.",
      404,
      { code: "LIVE_TRAINING_REPORT_DRAFT_NOT_FOUND" }
    );
  }

  const summary = coerceCoachPreviewNarrativeInSummary(
    draft.summaryJson as unknown as LiveTrainingSessionReportDraftSummary
  );

  const audienceViews = buildLiveTrainingReportAudienceViews(summary);

  const externalCoachRecommendations = await listExternalCoachRecommendationsForSession(sessionId);

  const arenaRow = await prisma.liveTrainingSession.findFirst({
    where: { id: sessionId, coachId: user.id },
    select: {
      sessionMeaningJson: true,
      teamId: true,
      trainingSessionId: true,
      arenaNextFocusAppliedAt: true,
      arenaNextFocusTargetTrainingSessionId: true,
      arenaNextFocusLine: true,
    },
  });
  const arenaNextTrainingFocusApply = arenaRow
    ? await buildArenaNextTrainingFocusApplyStateDto(arenaRow)
    : {
        nextSlotAvailable: false,
        applied: false,
        focusLineFromMeaning: null,
        appliedFocusLine: null,
        targetTrainingSessionId: null,
        appliedAt: null,
      };

  const rawSnapshot = row.plannedFocusSnapshot;
  const plannedFocusSnapshot =
    typeof rawSnapshot === "string" && rawSnapshot.trim() ? rawSnapshot.trim() : null;

  const publishedFinalReport =
    draft.status === "ready"
      ? await loadPublishedFinalReadForCoach(user, row, {
          status: draft.status,
          publishedAt: draft.publishedAt,
        })
      : null;

  // `plannedTrainingFocus` mirrors `plannedFocusSnapshot` for additive API compatibility (no TrainingSession read).
  return {
    reportDraft: {
      id: draft.id,
      liveTrainingSessionId: draft.liveTrainingSessionId,
      status: draft.status,
      title: draft.title,
      publishedAt: draft.publishedAt?.toISOString() ?? null,
      summary,
    },
    audienceViews,
    publishedFinalReport,
    externalCoachRecommendations,
    arenaNextTrainingFocusApply,
    plannedFocusSnapshot,
    plannedTrainingFocus: plannedFocusSnapshot,
  };
}

export async function confirmExternalCoachRecommendationForCoach(
  user: ApiUser,
  sessionId: string,
  externalCoachId: string,
  playerId?: string | null
): Promise<ExternalCoachRecommendationCoachDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);
  if (row.status !== "confirmed") {
    throw new LiveTrainingHttpError(
      "Доступно только для подтверждённой тренировки",
      409,
      { code: "LIVE_TRAINING_SESSION_NOT_CONFIRMED" }
    );
  }
  const ext = externalCoachId?.trim();
  if (!ext) {
    throw new LiveTrainingHttpError("Не указан тренер", 400);
  }
  return confirmExternalCoachRecommendation({
    liveSessionId: sessionId,
    externalCoachId: ext,
    playerId,
  });
}

export async function dismissExternalCoachRecommendationForCoach(
  user: ApiUser,
  sessionId: string,
  recommendationId: string
): Promise<ExternalCoachRecommendationCoachDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);
  if (row.status !== "confirmed") {
    throw new LiveTrainingHttpError(
      "Доступно только для подтверждённой тренировки",
      409,
      { code: "LIVE_TRAINING_SESSION_NOT_CONFIRMED" }
    );
  }
  const rid = recommendationId?.trim();
  if (!rid) {
    throw new LiveTrainingHttpError("Не указана запись", 400);
  }
  try {
    return await dismissExternalCoachRecommendation({
      liveSessionId: sessionId,
      recommendationId: rid,
    });
  } catch {
    throw new LiveTrainingHttpError("Запись не найдена", 404);
  }
}

async function loadExternalCoachRecommendationForCoachAccess(
  user: ApiUser,
  recommendationId: string
): Promise<{ id: string; status: string }> {
  const rid = recommendationId?.trim();
  if (!rid) {
    throw new LiveTrainingHttpError("Не указана запись", 400);
  }
  const rec = await prisma.externalCoachRecommendation.findUnique({
    where: { id: rid },
    include: { LiveTrainingSession: { select: { coachId: true, teamId: true } } },
  });
  if (!rec) {
    throw new LiveTrainingHttpError("Запись не найдена", 404);
  }
  if (rec.LiveTrainingSession.coachId !== user.id) {
    throw new LiveTrainingHttpError("Нет доступа", 403);
  }
  await assertTeamAccess(user, rec.LiveTrainingSession.teamId);
  return { id: rec.id, status: rec.status };
}

/** STEP 22: чтение отзыва (только confirmed recommendation). */
export async function getExternalCoachFeedbackForCoach(
  user: ApiUser,
  recommendationId: string
): Promise<ExternalCoachFeedbackRowDto | null> {
  const rec = await loadExternalCoachRecommendationForCoachAccess(user, recommendationId);
  if (rec.status !== EXTERNAL_COACH_RECOMMENDATION_STATUS.confirmed) {
    throw new LiveTrainingHttpError("Доступно только для подтверждённого подбора", 409, {
      code: "EXTERNAL_COACH_RECOMMENDATION_NOT_CONFIRMED",
    });
  }
  return getExternalCoachFeedbackByRecommendationId(rec.id);
}

/** STEP 22: сохранение отзыва (upsert, один на recommendation). */
export async function saveExternalCoachFeedbackForCoach(
  user: ApiUser,
  recommendationId: string,
  summary: string,
  focusAreas: string[]
): Promise<ExternalCoachFeedbackRowDto> {
  const rec = await loadExternalCoachRecommendationForCoachAccess(user, recommendationId);
  if (rec.status !== EXTERNAL_COACH_RECOMMENDATION_STATUS.confirmed) {
    throw new LiveTrainingHttpError("Отзыв можно сохранить только для подтверждённого подбора", 409, {
      code: "EXTERNAL_COACH_RECOMMENDATION_NOT_CONFIRMED",
    });
  }
  try {
    return await upsertExternalCoachFeedback({
      recommendationId: rec.id,
      summary,
      focusAreas,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("summary required")) {
      throw new LiveTrainingHttpError("Краткое резюме обязательно", 400);
    }
    throw e;
  }
}

export async function patchLiveTrainingSessionReportDraftCoachNarrativeForCoach(
  user: ApiUser,
  sessionId: string,
  coachPreviewNarrativeRaw: unknown
): Promise<LiveTrainingSessionReportDraftWithAudienceDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);
  if (row.status !== "confirmed") {
    throw new LiveTrainingHttpError(
      "Черновик отчёта доступен только для подтверждённой тренировки",
      409,
      { code: "LIVE_TRAINING_SESSION_NOT_CONFIRMED" }
    );
  }

  const draftRow = await prisma.liveTrainingSessionReportDraft.findUnique({
    where: { liveTrainingSessionId: sessionId },
  });
  if (!draftRow) {
    throw new LiveTrainingHttpError("Черновик отчёта не найден", 404);
  }
  if (draftRow.status !== "draft") {
    throw new LiveTrainingHttpError("Черновик отчёта нельзя редактировать в текущем статусе", 409, {
      code: "REPORT_DRAFT_NOT_EDITABLE",
    });
  }

  const normalized = parseCoachPreviewNarrativeFromRequestBody(coachPreviewNarrativeRaw);

  /**
   * PATCH принимает полный объект coachPreviewNarrative (три слота). После сохранения все слоты
   * считаются явно отредактированными: coachPreviewNarrativeMetaV1 — все true, даже если после
   * нормализации массивы пустые (тренер очистил слот намеренно). Незатронутых слотов в протоколе нет.
   */
  const withNarrative: LiveTrainingSessionReportDraftSummary = {
    ...coerceCoachPreviewNarrativeInSummary(
      draftRow.summaryJson as unknown as LiveTrainingSessionReportDraftSummary
    ),
    coachPreviewNarrativeV1: normalized,
    coachPreviewNarrativeMetaV1: COACH_PREVIEW_NARRATIVE_META_ALL_SLOTS_TOUCHED_V1,
  };

  const summary = await rehydrateMeaningDerivedFieldsOnDraftSummary(withNarrative, sessionId);

  await prisma.liveTrainingSessionReportDraft.update({
    where: { liveTrainingSessionId: sessionId },
    data: { summaryJson: summary as unknown as Prisma.InputJsonValue },
  });

  return getLiveTrainingSessionReportDraftForCoach(user, sessionId);
}

export async function publishLiveTrainingSessionReportDraftForCoach(
  user: ApiUser,
  sessionId: string
): Promise<PublishLiveTrainingSessionReportDraftResultDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  await assertTeamAccess(user, row.teamId);
  if (row.status !== "confirmed") {
    throw new LiveTrainingHttpError(
      "Черновик отчёта доступен только для подтверждённой тренировки",
      409,
      { code: "LIVE_TRAINING_SESSION_NOT_CONFIRMED" }
    );
  }

  let draftRow = await prisma.liveTrainingSessionReportDraft.findUnique({
    where: { liveTrainingSessionId: sessionId },
  });
  if (!draftRow) {
    await upsertLiveTrainingSessionReportDraft(sessionId);
    draftRow = await prisma.liveTrainingSessionReportDraft.findUnique({
      where: { liveTrainingSessionId: sessionId },
    });
  }
  if (!draftRow) {
    throw new LiveTrainingHttpError("Черновик отчёта не найден", 404, { code: "REPORT_DRAFT_NOT_FOUND" });
  }
  if (draftRow.status === "ready") {
    throw new LiveTrainingHttpError("Отчёт уже опубликован", 409, {
      code: "REPORT_DRAFT_ALREADY_PUBLISHED",
    });
  }
  if (draftRow.status !== "draft") {
    throw new LiveTrainingHttpError("Черновик нельзя опубликовать в текущем статусе", 409, {
      code: "REPORT_DRAFT_NOT_PUBLISHABLE_STATE",
    });
  }

  let summaryParsed = coerceCoachPreviewNarrativeInSummary(
    draftRow.summaryJson as unknown as LiveTrainingSessionReportDraftSummary
  );

  const meaningRow = await prisma.liveTrainingSession.findUnique({
    where: { id: sessionId },
    select: { sessionMeaningJson: true },
  });
  const persistedMeaningForPublish = parsePersistedSessionMeaning(meaningRow?.sessionMeaningJson);

  let narrative = summaryParsed.coachPreviewNarrativeV1;
  if (!narrative || !hasPublishableCoachPreviewNarrativeV1(narrative)) {
    narrative = augmentCoachNarrativeWithSessionMeaning(narrative, persistedMeaningForPublish);
    summaryParsed = { ...summaryParsed, coachPreviewNarrativeV1: narrative };
  }
  if (!narrative || !hasPublishableCoachPreviewNarrativeV1(narrative)) {
    throw new LiveTrainingHttpError(
      "Недостаточно содержимого для публикации: добавьте сводку, фокус или акцент по игроку",
      400,
      { code: "REPORT_DRAFT_NOT_PUBLISHABLE_CONTENT" }
    );
  }

  const trainingId = resolveLinkedTrainingSessionIdForLivePublish(row);
  if (!trainingId) {
    throw new LiveTrainingHttpError(
      "Нет привязки к тренировке в расписании — публикация невозможна",
      409,
      { code: "LIVE_TRAINING_NO_LINKED_TRAINING_SESSION" }
    );
  }

  const trainingSession = await prisma.trainingSession.findUnique({
    where: { id: trainingId },
    include: { team: { select: { schoolId: true, name: true } } },
  });
  if (!trainingSession) {
    throw new LiveTrainingHttpError("Тренировка в расписании не найдена", 404, {
      code: "TRAINING_SESSION_NOT_FOUND",
    });
  }
  if (trainingSession.teamId !== row.teamId) {
    throw new LiveTrainingHttpError("Тренировка не относится к этой команде", 409, {
      code: "TRAINING_SESSION_TEAM_MISMATCH",
    });
  }
  if (!canUserAccessSessionTeam(user, trainingSession)) {
    throw new LiveTrainingHttpError("Нет доступа к тренировке в расписании", 403);
  }

  const existingReport = await prisma.trainingSessionReport.findUnique({
    where: { trainingId },
  });
  const teamName = row.Team.name ?? summaryParsed.sessionMeta.teamName ?? "";
  const fields = buildTrainingSessionReportPayloadFromCoachNarrative(
    narrative,
    teamName,
    existingReport?.parentMessage
  );

  const publishedAt = new Date();

  const report = await prisma.$transaction(async (tx) => {
    const r = await upsertTrainingSessionReportCanonicalInTransaction(tx, trainingId, fields);
    await tx.liveTrainingSessionReportDraft.update({
      where: { liveTrainingSessionId: sessionId },
      data: { status: "ready", publishedAt },
    });
    return r;
  });

  const previewForParents =
    fields.parentMessage?.trim() ||
    fields.summary?.trim() ||
    fields.focusAreas?.trim() ||
    "";
  void notifyParentsOfPublishedTrainingReport({
    trainingId,
    teamName: trainingSession.team?.name ?? null,
    previewLine: previewForParents,
  }).catch((e) =>
    console.warn("[live-training] parent re-engagement notify failed:", e)
  );

  const hydrated = await getLiveTrainingSessionReportDraftForCoach(user, sessionId);

  return {
    ...hydrated,
    finalReport: {
      trainingId,
      summary: report.summary,
      focusAreas: report.focusAreas,
      coachNote: report.coachNote,
      parentMessage: report.parentMessage,
      updatedAt: report.updatedAt.toISOString(),
    },
  };
}

/** UNUSED LEGACY / NOT IN PRODUCT FLOW — HTTP surface exists; no mobile client calls found in repo. */
export async function cancelLiveTrainingSession(
  user: ApiUser,
  sessionId: string
): Promise<LiveTrainingSessionDto> {
  const row = await loadSessionForCoach(sessionId, user.id);
  if (!row) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  if (row.status === "confirmed") {
    throw new LiveTrainingHttpError("Подтверждённую сессию нельзя отменить", 400);
  }
  if (row.status === "cancelled") {
    return mapSession(row);
  }

  await prisma.liveTrainingSession.update({
    where: { id: sessionId },
    data: { status: "cancelled" },
  });

  const updated = await loadSessionForCoach(sessionId, user.id);
  if (!updated) {
    throw new LiveTrainingHttpError("Сессия не найдена", 404);
  }
  return mapSession(updated);
}

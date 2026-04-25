/**
 * Live Training — доменная модель (PHASE 1 skeleton).
 * Дальнейшая синхронизация с API без смены контрактов экранов.
 */

export type LiveTrainingMode = "ice" | "ofp" | "mixed";

export type LiveTrainingSessionStatus =
  | "idle"
  | "live"
  | "review"
  | "confirmed"
  | "cancelled";

export type LiveTrainingSessionAnalyticsSummary = {
  signalCount: number;
  playersWithSignals: number;
  draftsWithPlayerCount: number;
};

/** CRM GET session: cohort rollup for `session_canonical_v1` materialized signals only (not strict group truth). */
export type LiveTrainingSessionGroupContextCoverageKind =
  | "no_signals"
  | "all_legacy"
  | "mixed"
  | "fully_attributed";

export type LiveTrainingSessionGroupContextSignalRollup = {
  liveTrainingSessionId: string;
  teamId: string;
  canonicalGroupId: string | null;
  attributionVersionUsed: "session_canonical_v1";
  attributedSignalCount: number;
  legacySignalCount: number;
  attributedPositiveSignalCount: number;
  attributedNegativeSignalCount: number;
  attributedDomainsJson: Record<string, number>;
  coverageKind: LiveTrainingSessionGroupContextCoverageKind;
};

export type LiveTrainingSessionGroupContextStampConsistencyKind =
  | "no_signals"
  | "no_attributed_signals"
  | "canonical_present_but_unstamped_only"
  | "aligned"
  | "mixed_stamps"
  | "canonical_null_but_stamped"
  | "mismatch";

export type LiveTrainingSessionGroupContextStampDiagnostic = {
  liveTrainingSessionId: string;
  teamId: string;
  canonicalGroupId: string | null;
  attributedSignalCount: number;
  legacySignalCount: number;
  distinctStampedGroupIds: string[];
  stampedNullPresent: boolean;
  consistencyKind: LiveTrainingSessionGroupContextStampConsistencyKind;
  consistencyNote?: string;
};

export type LiveTrainingSessionOutcomePlayer = {
  playerId: string;
  playerName: string;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topDomains: string[];
};

export type LiveTrainingSessionOutcome = {
  includedDraftsCount: number;
  excludedDraftsCount: number;
  draftsFlaggedNeedsReview: number;
  /** Черновики с needsReview или player-цель без playerId (каждый черновик один раз). */
  manualAttentionDraftsCount: number;
  /** Подтверждённые наблюдения по цели (arena:team / arena:session / игрок). */
  playerObservationCount: number;
  /** Player-цель с привязкой к карточке игрока. */
  playerLinkedObservationCount: number;
  /** Player-цель без playerId (не попадёт в сигнал без уточнения). */
  playerObservationUnlinkedCount: number;
  teamObservationCount: number;
  sessionObservationCount: number;
  signalsCreatedCount: number;
  affectedPlayersCount: number;
  positiveSignalsCount: number;
  negativeSignalsCount: number;
  neutralSignalsCount: number;
  topDomains: string[];
  topPlayers: LiveTrainingSessionOutcomePlayer[];
};

/** PHASE 44: оценка закрытия приоритетов старта по подтверждённым сигналам. */
export type LiveTrainingPriorityAlignmentReview = {
  alignmentScore: number;
  /** not_applicable — оценка не считалась (нет приоритетов в плане), не «слабый результат». */
  alignmentBand: "strong" | "partial" | "weak" | "not_applicable";
  playerCoverage: Array<{ playerId: string; playerName: string; covered: boolean }>;
  domainCoverage: Array<{ domain: string; covered: boolean }>;
  reinforcementCoverage: Array<{ domain: string; covered: boolean }>;
  uncoveredPlayers: string[];
  uncoveredDomains: string[];
  uncoveredReinforcement: string[];
  explanation: string[];
  computedAt: string;
  skippedNoTargets: boolean;
  /**
   * false: не интерпретировать alignmentScore как успех (PHASE 44.1).
   * Для старых JSON без поля клиент выставляет !skippedNoTargets.
   */
  evaluationApplied: boolean;
};

/** PHASE 40: lock-in после confirm — мост в следующий старт (компактный JSON с сервера). */
export type LiveTrainingContinuitySnapshot = {
  version: 1;
  generatedAt: string;
  teamId: string;
  carriedFocusPlayers: Array<{ playerId: string; playerName: string; reason: string }>;
  carriedDomains: Array<{ domain: string; labelRu: string; reason: string; source: string }>;
  carriedReinforceAreas: Array<{ domain: string; labelRu: string; reason: string }>;
  summaryLines: string[];
  /** PHASE 44 */
  priorityAlignmentReview?: LiveTrainingPriorityAlignmentReview;
  /** PHASE 48: агрегированный кадр качества (после confirm) */
  trainingQualityFrame?: LiveTrainingQualityFrame;
};

/** PHASE 48 */
export type LiveTrainingQualityBand = "stable" | "watch" | "recovery";

export type LiveTrainingQualityFrame = {
  qualityBand: LiveTrainingQualityBand | null;
  alignmentBand: LiveTrainingPriorityAlignmentReview["alignmentBand"];
  executionPressureMode: "normal" | "watch" | "tighten";
  unresolvedPriorityCount: number;
  repeatedGapSignalCount: number;
  explanation: string[];
  computedAt: string;
  evaluationApplied: boolean;
};

/** PHASE 20: короткая подсказка по контексту сессии. */
export type LiveTrainingGuidanceCueType =
  | "focus_player"
  | "focus_domain"
  | "reinforce"
  | "reminder";

export type LiveTrainingGuidanceSourceBlockType =
  | "warmup"
  | "main"
  | "focus"
  | "reinforcement";

export type LiveTrainingGuidanceCue = {
  id: string;
  cueType: LiveTrainingGuidanceCueType;
  title: string;
  body?: string;
  tone: "attention" | "neutral" | "positive";
  linkedPlayerId?: string;
  linkedDomain?: string;
  /** PHASE 31: привязка к блоку planSeeds (если есть) */
  sourceBlockType?: LiveTrainingGuidanceSourceBlockType;
};

export type LiveTrainingGuidanceCuesPayload = {
  cues: LiveTrainingGuidanceCue[];
  lowData: boolean;
};

/** PHASE 42: приоритеты старта, handoff в live (внутри planningSnapshot). */
export type LiveTrainingPlanningSnapshotStartPriorities = {
  primaryPlayers: Array<{
    playerId: string;
    playerName: string;
    reason: string;
    source:
      | "continuity_lock_in"
      | "follow_up"
      | "planning_focus"
      | "recent_wrap_up"
      | "unresolved_priority_carry_forward";
  }>;
  primaryDomains: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    source:
      | "continuity_lock_in"
      | "follow_up"
      | "planning_focus"
      | "recent_wrap_up"
      | "unresolved_priority_carry_forward";
  }>;
  secondaryItems: string[];
  reinforcementItems: string[];
  summaryLine?: string;
  lowData: boolean;
};

/** Контекст слота CRM внутри planningSnapshot (сервер: planningSnapshotJson.scheduleSlotContext). */
export type LiveTrainingScheduleSlotContext = {
  teamId: string;
  groupId: string | null;
  groupName?: string | null;
  trainingSlotId?: string | null;
  trainingType?: string | null;
  scheduledAt?: string | null;
  scheduledEndAt?: string | null;
};

/** Семена подсказок из отчётов (клиент → planningSnapshotJson). */
export type LiveTrainingPlanningSnapshotSuggestionSeeds = {
  source: "report_action_layer";
  items: string[];
};

/** PHASE 6 Step 13: перенос nextActions с прошлой подтверждённой сессии (сервер при POST session). */
export type LiveTrainingPreviousSessionNextActionsCarryV1 = {
  version: 1;
  sourceLiveTrainingSessionId: string;
  trainingFocus: string[];
  teamAccents: string[];
  players: Array<{ playerId: string; playerName: string; actions: string[] }>;
};

/** STEP 21: подтверждённый внешний подбор в стартовом planning (сервер). */
export type LiveTrainingConfirmedExternalDevelopmentCarry = {
  playerId?: string;
  coachName: string;
  skills: string[];
  source: "external_coach";
};

/** STEP 22: отзыв внешнего тренера в planning (сервер). */
export type LiveTrainingExternalCoachFeedbackCarry = {
  playerId?: string;
  coachName: string;
  summary: string;
  focusAreas: string[];
};

/** PHASE 19: снимок planning-контекста на момент старта сессии. */
export type LiveTrainingPlanningSnapshot = {
  generatedAt: string;
  teamId: string;
  focusPlayers: Array<{
    playerId: string;
    playerName: string;
    reasons: string[];
    priority: "high" | "medium" | "low";
  }>;
  focusDomains: Array<{
    domain: string;
    labelRu: string;
    reason: string;
    priority: "high" | "medium" | "low";
  }>;
  reinforceAreas: Array<{
    domain: string;
    labelRu: string;
    reason: string;
  }>;
  summaryLines: string[];
  planSeeds: {
    blocks: Array<{
      type: string;
      title: string;
      description: string;
      linkedDomains?: string[];
      focusPlayers?: Array<{ playerId: string; playerName: string }>;
    }>;
    lowData: boolean;
  };
  /** PHASE 42 */
  startPriorities?: LiveTrainingPlanningSnapshotStartPriorities;
  /** Связь с расписанием CRM; старые снимки без поля — клиент падает на query URL. */
  scheduleSlotContext?: LiveTrainingScheduleSlotContext;
  /** PHASE 48: трассировка подсказок из отчётов (опционально). */
  suggestionSeeds?: LiveTrainingPlanningSnapshotSuggestionSeeds;
  /** PHASE 6 Step 13 */
  previousSessionNextActionsCarryV1?: LiveTrainingPreviousSessionNextActionsCarryV1;
  /** STEP 21 */
  confirmedExternalDevelopmentCarry?: LiveTrainingConfirmedExternalDevelopmentCarry;
  /** STEP 22 */
  externalCoachFeedbackCarry?: LiveTrainingExternalCoachFeedbackCarry;
};

/** PHASE 6 Step 11: срез sessionMeaningJson для live HUD (не полный серверный объект). */
export type LiveTrainingSessionMeaning = {
  version: number;
  builtAt: string;
  themes: Array<{ key: string; weight: number }>;
  focus: Array<{ label: string; weight: number }>;
  players: Array<{
    playerId: string;
    playerName: string;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    topThemes: string[];
  }>;
};

export interface LiveTrainingSession {
  id: string;
  teamId: string;
  teamName: string;
  mode: LiveTrainingMode;
  startedAt: string;
  endedAt: string | null;
  status: LiveTrainingSessionStatus;
  /** Слот CRM, если live стартовал из расписания (сервер: колонка `trainingSessionId`). */
  trainingSessionId?: string | null;
  /** PHASE 19: контекст со стартового экрана (если сохранён). */
  planningSnapshot?: LiveTrainingPlanningSnapshot;
  /** PHASE 20: подсказки по снимку (если есть). */
  guidanceCues?: LiveTrainingGuidanceCuesPayload;
  /** Для подтверждённой сессии — агрегаты сигналов аналитики. */
  analyticsSummary?: LiveTrainingSessionAnalyticsSummary | null;
  /** PHASE 10: итог сессии для экрана завершения. */
  outcome?: LiveTrainingSessionOutcome | null;
  /** PHASE 40: что зафиксировано для переноса в следующий цикл. */
  continuitySnapshot?: LiveTrainingContinuitySnapshot | null;
  /** PHASE 6 Step 9: только сразу после POST .../finish при авто-confirm. */
  autoFinalized?: boolean;
  /** PHASE 6 Step 11: кэш смысла (read-model), приходит с GET session после ingest. */
  sessionMeaningJson?: LiveTrainingSessionMeaning | null;
  /**
   * Только `status === "confirmed"`: rollup attributed cohort vs legacy (session-context, не team PvO).
   * @see `GET /api/live-training/sessions/[id]`
   */
  groupContextSignalRollup?: LiveTrainingSessionGroupContextSignalRollup;
  /** Только `status === "confirmed"`: stamp vs canonical re-read diagnostic. */
  groupContextStampDiagnostic?: LiveTrainingSessionGroupContextStampDiagnostic;
}

export type LiveTrainingConfirmAnalytics = {
  createdSignalsCount: number;
  affectedPlayersCount: number;
  alreadyConfirmed: boolean;
};

export type LiveTrainingConfirmResult = {
  session: LiveTrainingSession;
  observationIds: string[];
  analytics: LiveTrainingConfirmAnalytics;
  outcome: LiveTrainingSessionOutcome;
  /** PHASE 44 */
  priorityAlignment: LiveTrainingPriorityAlignmentReview;
};

export type LiveTrainingSentiment = "positive" | "negative" | "neutral";

/** PHASE 22: компактная provenance с сервера (ingest). */
export type LiveTrainingDraftProvenance = {
  contextUsed: boolean;
  contextAdjustedPlayerMatch: boolean;
  contextAdjustedCategory: boolean;
  contextAdjustedSentiment: boolean;
  parserConfidenceBeforeContext: number | null;
  parserConfidenceAfterContext: number | null;
  contextSignals: string[];
  contextSuggestionPlayerId?: string | null;
  contextSuggestionPlayerName?: string | null;
  contextSuggestionCategory?: string | null;
  contextSuggestionSentiment?: LiveTrainingSentiment | null;
  /** PHASE 32: block-aware ingest layer */
  blockContextUsed?: boolean;
  blockContextSignals?: string[];
  contextAdjustedPlayerMatchSource?: "snapshot" | "focus_block" | "start_priority" | null;
  contextAdjustedCategorySource?:
    | "snapshot"
    | "main_block"
    | "reinforcement_block"
    | "warmup_block"
    | "start_priority"
    | null;
  contextAdjustedSentimentSource?: "snapshot" | "reinforcement_block" | null;
  /** PHASE 43 */
  startPriorityUsed?: boolean;
  startPrioritySignals?: string[];
  startPriorityPlayerHit?: boolean;
  startPriorityDomainHit?: boolean;
  startPriorityReinforcementHit?: boolean;
};

/** PHASE 34: слой структуры тренировки / snapshot для подписи в UI */
export type LiveTrainingDraftCorrectionSuggestionSourceLayer =
  | "focus_block"
  | "main_block"
  | "reinforcement_block"
  | "warmup_block"
  | "snapshot";

/** PHASE 35: важность подсказки в очереди review */
export type LiveTrainingDraftCorrectionSuggestionPriority = "high" | "medium" | "low";

/** PHASE 35: оценка надёжности сигнала */
export type LiveTrainingDraftCorrectionSuggestionConfidence = "high" | "medium" | "low";

/** PHASE 23: быстрая правка с PATCH merge. */
export type LiveTrainingDraftCorrectionSuggestion = {
  id: string;
  suggestionType: "player" | "category" | "sentiment";
  label: string;
  value: string;
  tone: "neutral" | "attention" | "positive";
  patch: {
    playerId?: string | null;
    playerNameRaw?: string | null;
    category?: string;
    sentiment?: LiveTrainingSentiment;
  };
  /** PHASE 34: опционально; старые ответы без поля остаются валидными */
  sourceLayer?: LiveTrainingDraftCorrectionSuggestionSourceLayer;
  /** PHASE 35: опционально для старых ответов API */
  suggestionPriority?: LiveTrainingDraftCorrectionSuggestionPriority;
  suggestionConfidence?: LiveTrainingDraftCorrectionSuggestionConfidence;
};

/** Сервер: `deriveArenaCoachReviewState` — опционально в ответах review/drafts. */
export type LiveTrainingArenaCoachReviewCategory =
  | "clarification"
  | "mistake"
  | "behavior"
  | "success"
  | "neutral"
  | "unclear";

export type LiveTrainingArenaCoachReviewPriority = "high" | "medium" | "low";

export interface LiveTrainingArenaCoachDecision {
  requiresCoachReview: boolean;
  reviewCategory: LiveTrainingArenaCoachReviewCategory;
  reviewPriority: LiveTrainingArenaCoachReviewPriority;
  coachAttentionReasons: string[];
  repeatedConcernInSession?: boolean;
}

/** Сервер: `interpretArenaObservation` — опционально для черновиков с игроком. */
export interface LiveTrainingArenaObservationInterpretation {
  signalKind: "success" | "mistake" | "neutral_observation";
  domain: "technical" | "tactical" | "physical" | "behavioral" | "unclear";
  direction: "positive" | "negative" | "neutral";
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  rationale?: string;
}

export interface LiveTrainingObservationDraft {
  id: string;
  sessionId: string;
  playerId: string | null;
  playerNameRaw: string | null;
  sourceText: string;
  category: string;
  sentiment: LiveTrainingSentiment;
  confidence: number | null;
  needsReview: boolean;
  /** PHASE 22 */
  provenance?: LiveTrainingDraftProvenance | null;
  /** PHASE 23 */
  correctionSuggestions?: LiveTrainingDraftCorrectionSuggestion[];
  /** Сервер: rule-based Arena interpretation */
  interpretation?: LiveTrainingArenaObservationInterpretation | null;
  /** Сервер: единая семантика review для тренера */
  coachDecision?: LiveTrainingArenaCoachDecision | null;
}

export interface LiveTrainingReviewRosterEntry {
  id: string;
  name: string;
}

export interface LiveTrainingReviewSummary {
  toConfirmCount: number;
  needsReviewCount: number;
  unassignedCount: number;
  excludedCount: number;
  /** Всего активных черновиков; при scope=exceptions больше, чем длина списка на экране. */
  totalActiveDraftCount?: number;
  /** `exceptions` — только очередь внимания; `all` — полный список (fallback). */
  reviewListScope?: "exceptions" | "all";
}

export interface LiveTrainingPreConfirmSummary {
  playersWithDraftsCount: number;
  topDraftPlayers: Array<{
    playerId: string;
    playerName: string;
    draftCount: number;
  }>;
}

export interface LiveTrainingReviewState {
  sessionId: string;
  drafts: LiveTrainingObservationDraft[];
  roster: LiveTrainingReviewRosterEntry[];
  reviewSummary: LiveTrainingReviewSummary;
  preConfirmSummary: LiveTrainingPreConfirmSummary;
  unresolvedCount: number;
  confirmedCount: number;
}

/** PHASE 11: structured report draft (summaryJson shape). */
export type LiveTrainingReportDraftEvidenceItem = {
  text: string;
  direction: string;
  domain: string;
};

export type LiveTrainingReportDraftPlayerSummary = {
  playerId: string;
  playerName: string;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topDomains: string[];
  evidence: LiveTrainingReportDraftEvidenceItem[];
};

export type LiveTrainingReportDraftNoteItem = {
  text: string;
  playerId?: string;
  playerName?: string;
};

/** Канонический текстовый слой превью тренера (сохранение в summaryJson). */
export type LiveTrainingCoachPreviewNarrativePlayerHighlightV1 = {
  playerId?: string | null;
  playerName?: string | null;
  text: string;
  /** Legacy в summaryJson; сервер нормализует в `text`. */
  summaryLine?: string | null;
};

export type LiveTrainingCoachPreviewNarrativeV1 = {
  sessionSummaryLines: string[];
  focusAreas: string[];
  playerHighlights: LiveTrainingCoachPreviewNarrativePlayerHighlightV1[];
};

export type LiveTrainingCoachPreviewNarrativeMetaV1 = {
  sessionSummaryLinesManuallyEdited: boolean;
  focusAreasManuallyEdited: boolean;
  playerHighlightsManuallyEdited: boolean;
};

/** PHASE 6 Step 12: следующие шаги из SessionMeaning (в summaryJson / coachView). */
export type LiveTrainingSessionMeaningNextActionsV1 = {
  team: string[];
  players: Array<{ playerId: string; playerName: string; actions: string[] }>;
  nextTrainingFocus: string[];
};

/** PHASE 6 Step 14: строки для родителя (персист в summaryJson). */
export type LiveTrainingSessionMeaningParentActionRowV1 = {
  playerId: string;
  playerName: string;
  actions: string[];
};

/** PHASE 6 Step 15: прогресс vs прошлая confirmed сессия (из SessionMeaning). */
export type LiveTrainingSessionMeaningProgressV1 = {
  team: string[];
  players: Array<{
    playerId: string;
    playerName: string;
    progress: "improved" | "no_change" | "regressed";
    note: string;
  }>;
};

/** PHASE 6 Step 16: триггеры Арены (только фиксация решения). */
export type LiveTrainingSessionMeaningActionTriggerV1 = {
  type: "extra_training" | "attention_required" | "progress_high";
  target: "player" | "team";
  playerId?: string;
  reason: string;
};

/** PHASE 6 Step 17: производные от actionTriggers. */
export type LiveTrainingSessionMeaningSuggestedRecommendedCoachV1 = {
  id: string;
  name: string;
  skills: string[];
};

export type LiveTrainingSessionMeaningSuggestedCoachV1 = {
  type: "attention_required" | "extra_training" | "progress_high";
  target: "player" | "team";
  playerId?: string;
  title: string;
  description: string;
  cta: string;
  recommendedCoaches?: LiveTrainingSessionMeaningSuggestedRecommendedCoachV1[];
};

export type LiveTrainingSessionMeaningSuggestedParentV1 = {
  type: "progress_high";
  playerId?: string;
  title: string;
  description: string;
};

export type LiveTrainingSessionMeaningSuggestedActionsV1 = {
  coach: LiveTrainingSessionMeaningSuggestedCoachV1[];
  parent: LiveTrainingSessionMeaningSuggestedParentV1[];
};

/** STEP 24 */
export type LiveTrainingExternalWorkImpactRowV1 = {
  playerId?: string;
  playerName: string;
  status: "helped" | "no_clear_effect" | "needs_more_time";
  note: string;
};

export type LiveTrainingSessionReportDraftSummary = {
  sessionMeta: {
    teamName: string;
    mode: string;
    startedAt: string;
    endedAt: string | null;
    confirmedAt: string | null;
  };
  counters: {
    includedDraftsCount: number;
    signalsCreatedCount: number;
    affectedPlayersCount: number;
    positiveSignalsCount: number;
    negativeSignalsCount: number;
    neutralSignalsCount: number;
    excludedDraftsCount: number;
    draftsFlaggedNeedsReview: number;
  };
  focusDomains: string[];
  players: LiveTrainingReportDraftPlayerSummary[];
  notes: {
    needsAttention: LiveTrainingReportDraftNoteItem[];
    positives: LiveTrainingReportDraftNoteItem[];
  };
  coachPreviewNarrativeV1?: LiveTrainingCoachPreviewNarrativeV1;
  coachPreviewNarrativeMetaV1?: LiveTrainingCoachPreviewNarrativeMetaV1;
  sessionMeaningNextActionsV1?: LiveTrainingSessionMeaningNextActionsV1;
  sessionMeaningParentActionsV1?: LiveTrainingSessionMeaningParentActionRowV1[];
  sessionMeaningProgressV1?: LiveTrainingSessionMeaningProgressV1;
  sessionMeaningActionTriggersV1?: LiveTrainingSessionMeaningActionTriggerV1[];
  sessionMeaningSuggestedActionsV1?: LiveTrainingSessionMeaningSuggestedActionsV1;
  externalWorkImpactV1?: LiveTrainingExternalWorkImpactRowV1[];
};

export type LiveTrainingSessionReportDraft = {
  id: string;
  liveTrainingSessionId: string;
  status: string;
  title: string;
  /** ISO; после публикации в CRM-отчёт по тренировке. */
  publishedAt: string | null;
  summary: LiveTrainingSessionReportDraftSummary;
};

/** PHASE 12: проекции для превью (без публикации). */
export type LiveTrainingCoachView = {
  sessionMeta: LiveTrainingSessionReportDraftSummary["sessionMeta"];
  counters: LiveTrainingSessionReportDraftSummary["counters"];
  focusDomains: string[];
  players: LiveTrainingSessionReportDraftSummary["players"];
  notes: LiveTrainingSessionReportDraftSummary["notes"];
  internalReminders: string[];
  coachPreviewNarrativeV1?: LiveTrainingCoachPreviewNarrativeV1;
  nextActions?: LiveTrainingSessionMeaningNextActionsV1;
  sessionProgress?: LiveTrainingSessionMeaningProgressV1;
  arenaRecommendations?: LiveTrainingSessionMeaningActionTriggerV1[];
  suggestedActions?: LiveTrainingSessionMeaningSuggestedActionsV1;
  externalWorkImpactV1?: LiveTrainingExternalWorkImpactRowV1[];
};

export type LiveTrainingParentView = {
  sessionMeta: {
    teamLabel: string;
    modeLabel: string;
    dateLabel: string;
  };
  overviewLines: string[];
  highlights: string[];
  developmentFocus: string[];
  playerHighlights: Array<{ playerName: string; playerId?: string; summaryLine: string }>;
  supportNotes: string[];
  parentActions?: LiveTrainingSessionMeaningParentActionRowV1[];
  /** Одна строка о динамике относительно прошлой тренировки. */
  progressHeadlineRu?: string;
  /** Только progress_high. */
  arenaSafeRecommendations?: LiveTrainingSessionMeaningActionTriggerV1[];
  suggestedParentActions?: LiveTrainingSessionMeaningSuggestedParentV1[];
};

export type LiveTrainingSchoolView = {
  sessionMeta: LiveTrainingSessionReportDraftSummary["sessionMeta"];
  teamSummaryLines: string[];
  focusDomains: string[];
  playersInFocus: Array<{
    playerId: string;
    playerName: string;
    totalSignals: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    topDomains: string[];
  }>;
  counters: LiveTrainingSessionReportDraftSummary["counters"];
  monitoringNotes: string[];
};

export type LiveTrainingReportAudienceViews = {
  coachView: LiveTrainingCoachView;
  parentView: LiveTrainingParentView;
  schoolView: LiveTrainingSchoolView;
};

/** Ответ POST .../report-draft/publish */
export type LiveTrainingPublishedReportInfo = {
  trainingId: string;
  summary: string | null;
  focusAreas: string | null;
  coachNote: string | null;
  parentMessage: string | null;
  updatedAt: string;
};

/** GET report-draft: итог из TrainingSessionReport при status ready. */
export type LiveTrainingPublishedFinalReportRead = LiveTrainingPublishedReportInfo & {
  publishedAt: string | null;
  sessionLabel: string | null;
};

/** STEP 19: состояние строки подбора внешнего тренера (источник карточки — suggestedActions). */
export type LiveTrainingExternalCoachRecommendationRow = {
  id: string;
  liveSessionId: string;
  playerId: string | null;
  externalCoachId: string;
  triggerType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

/** GET report-draft: применение фокуса следующей тренировки (Арена → слот расписания). */
export type ArenaNextTrainingFocusApplyState = {
  nextSlotAvailable: boolean;
  applied: boolean;
  focusLineFromMeaning: string | null;
  appliedFocusLine: string | null;
  targetTrainingSessionId: string | null;
  appliedAt: string | null;
};

export type LiveTrainingReportDraftPayload = {
  reportDraft: LiveTrainingSessionReportDraft;
  audienceViews: LiveTrainingReportAudienceViews;
  publishedFinalReport: LiveTrainingPublishedFinalReportRead | null;
  /** Синхронизируется с suggestedActions.recommendedCoaches при загрузке черновика. */
  externalCoachRecommendations: LiveTrainingExternalCoachRecommendationRow[];
  arenaNextTrainingFocusApply: ArenaNextTrainingFocusApplyState;
  /** Planned focus слота на момент confirm (снимок на live-сессии). */
  plannedFocusSnapshot?: string | null;
  /**
   * @deprecated — use `plannedFocusSnapshot`. Same value from API; kept for backward compatibility, will be removed later.
   */
  plannedTrainingFocus?: string | null;
};

export type LiveTrainingReportDraftPublishResult = LiveTrainingReportDraftPayload & {
  finalReport: LiveTrainingPublishedReportInfo;
};

/** PATCH /api/live-training/sessions/:id/report-draft */
export type LiveTrainingReportDraftNarrativePatchBody = {
  coachPreviewNarrative: LiveTrainingCoachPreviewNarrativeV1;
};

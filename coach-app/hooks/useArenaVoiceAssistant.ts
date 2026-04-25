/**
 * Coach live Arena — голосовой ассистент в эфире (`live-training/*`).
 *
 * GROUNDING (PHASE 1 agent substrate)
 * -------------------------------------
 * Arena consumes only: (1) verbatim coach utterances from STT, (2) session/roster context
 * from authenticated session data, (3) parser/server-confirmed signals, (4) explicit
 * clarification answers. On ambiguity or low confidence, the flow asks for clarification
 * or defers — it does not invent events, players, or intents.
 *
 * Orchestration + grounded context live in `ArenaSessionOrchestrator` and
 * `ArenaSessionContextStore`; native STT I/O goes through `ArenaListeningTransport`.
 *
 * PHASE 2: continuous idle mic feeds final utterances into the same grounded parser path
 * (observation + read-only status) without forcing wake; wake/command remains for controls.
 * ❗ Не parent external `/api/arena/*` и не marketplace.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Alert, AppState, type AppStateStatus } from "react-native";
import { playArenaStopSound, playArenaWakeSound } from "@/lib/arenaAssistantSounds";
import {
  arenaContextAfterDelete,
  arenaContextAfterObservation,
  arenaContextAfterReassignPlayer,
  buildLastObservationStatusPhrase,
  createEmptyArenaConversationContext,
} from "@/lib/arenaConversationContext";
import { parseArenaIntent } from "@/lib/arena/parse-arena-intent";
import type { ArenaIntent } from "@/lib/arena/parse-arena-intent";
import {
  matchRosterHint,
  normalizeArenaText,
  parseArenaCommand,
  stripWakeWordFromTranscript,
  transcriptContainsWakeWord,
  type ArenaParsedIntent,
  type RosterEntry,
} from "@/lib/arenaVoiceIntentParser";
import { resolveArenaClarificationFollowUp } from "@/lib/arenaClarificationResolver";
import { normalizeArenaTranscript } from "@/lib/arenaTranscriptNormalizer";
import {
  ARENA_CLARIFY_MAX_FAILURES,
  createIdleArenaPendingClarification,
  isArenaPendingClarificationStale,
} from "@/lib/arenaPendingClarification";
import {
  ARENA_SILENCE_IDLE_MS,
  ARENA_SILENCE_IDLE_MIN_GAP_MS,
  pickSilenceIdlePrompt,
  pickTtsAfterPlayerObservation,
  pickTtsAfterSessionObservation,
  pickTtsAfterTeamObservation,
  pickTtsQueued,
  type ArenaScheduleSlotContext,
} from "@/lib/arenaAssistantBehavior";
import { speakArenaShort, stopArenaSpeech } from "@/lib/arenaVoiceFeedback";
import {
  ARENA_ALERT_COMMAND_FAILED_FALLBACK,
  ARENA_ALERT_DELETE_NOTHING,
  ARENA_ALERT_EMPTY_TRANSCRIPT,
  ARENA_ALERT_PLAYER_NOT_FOUND,
  ARENA_ALERT_REASSIGN_NO_DRAFT,
  ARENA_ALERT_SESSION_ALREADY_LIVE,
  ARENA_ALERT_TITLE,
  ARENA_ALERT_UNKNOWN_COMMAND,
  ARENA_ERR_CLARIFY_START,
  ARENA_ERR_LISTEN_START,
  ARENA_ERR_MIC_DENIED,
  ARENA_ERR_RECOGNITION_GENERIC,
  ARENA_ERR_WAKE_START,
  ARENA_TTS_CLARIFY_CANCELLED,
  ARENA_TTS_CLARIFY_GIVE_UP,
  ARENA_TTS_DELETED_LAST,
  ARENA_TTS_DELETE_NOTHING,
  ARENA_TTS_FINISH_FAILED,
  ARENA_TTS_INGEST_CLARIFY_GIVE_UP,
  ARENA_TTS_INGEST_CLARIFY_MANY,
  ARENA_TTS_INGEST_CLARIFY_REPEAT,
  ARENA_TTS_INGEST_QUEUED,
  ARENA_TTS_LAST_EMPTY,
  ARENA_TTS_SAVED_PLAYER,
  ARENA_TTS_PLAYER_NOT_FOUND,
  ARENA_TTS_REASSIGNED,
  ARENA_TTS_REASSIGN_NO_DRAFT,
  ARENA_TTS_REFRESHED,
  ARENA_TTS_SESSION_ALREADY_LIVE,
  ARENA_TTS_TIMER_PAUSED,
  ARENA_TTS_TIMER_RESUMED,
  ARENA_TTS_UNKNOWN,
  buildArenaTtsIngestClarifyTwo,
} from "@/lib/arenaVoicePhrases";
import type { Href } from "expo-router";
import {
  buildInsightTts,
  evaluateLiveCoachInsights,
  type LiveCoachInsightContext,
} from "@/lib/arenaCoachIntelligence";
import type { LiveTrainingEventItem } from "@/services/liveTrainingService";
import type { LiveTrainingSpeechResolutionPayload } from "@/services/liveTrainingService";
import type { LiveTrainingSentiment, LiveTrainingSession } from "@/types/liveTraining";
import {
  resolveClarificationVoiceAnswer,
  type ClarificationVoiceCandidate,
} from "@/lib/resolveClarificationVoiceAnswer";
import { createExpoSpeechArenaListeningTransport } from "@/lib/arenaListeningAdapter";
import type { ArenaListeningAdapterHandlers } from "@/lib/arenaListeningAdapter";
import { buildArenaGroundedUtteranceInterpretation, isArenaControlIntentRequiringWake } from "@/lib/arenaGroundedUtteranceInterpretation";
import { evaluateArenaSafeAutoPersistForVoiceIntent } from "@/lib/arenaSafeAutoPersistPolicy";
import { ArenaSessionContextStore } from "@/lib/arenaSessionContextStore";
import { ArenaSessionOrchestrator, type ArenaOrchestratorPhase } from "@/lib/arenaSessionOrchestrator";
import {
  arenaLiveUtteranceQueuePush,
  type ArenaLiveUtteranceJob,
  type ArenaLiveUtterancePipelineEntry,
} from "@/lib/arenaLiveUtteranceQueue";

type SpeechRecognitionNative = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: Record<string, unknown>) => Promise<void>;
  stop: () => void;
  abort: () => void;
};

function useSpeechRecognitionEventArenaStub(_event: string, _handler: (e?: unknown) => void) {
  /* no native module — hooks stay unconditional */
}

const STUB_SPEECH_RECOGNITION: SpeechRecognitionNative = {
  isRecognitionAvailable: () => false,
  requestPermissionsAsync: async () => ({ granted: false }),
  start: async () => {},
  stop: () => {},
  abort: () => {},
};

let ExpoSpeechRecognitionModule: SpeechRecognitionNative = STUB_SPEECH_RECOGNITION;
let useSpeechRecognitionEvent: (event: string, handler: (e?: unknown) => void) => void =
  useSpeechRecognitionEventArenaStub;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require("expo-speech-recognition") as {
    ExpoSpeechRecognitionModule: SpeechRecognitionNative;
    useSpeechRecognitionEvent: (event: string, handler: (e?: unknown) => void) => void;
  };
  ExpoSpeechRecognitionModule = pkg.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = pkg.useSpeechRecognitionEvent;
} catch (e) {
  if (__DEV__) {
    console.warn(
      "[useArenaVoiceAssistant] expo-speech-recognition unavailable (Expo Go?). Wake word and STT disabled; use manual input.",
      e
    );
  }
}

export type ArenaAssistantUiPhase = "idle" | "listening" | "processing";

const RU = "ru-RU";
const COMMAND_MAX_MS = 8000;
const SILENCE_TAIL_MS = 1000;
const IDLE_RESTART_MS = 500;
const WAKE_COOLDOWN_MS = 2000;
/** Подряд тот же нормализованный transcript — без повторного исполнения и TTS. */
const ANTI_REPEAT_WINDOW_MS = 2500;
const COACH_INSIGHT_COOLDOWN_MS = 72_000;
const COACH_INSIGHT_DELAY_AFTER_OBS_MS = 1350;
/** Короткое окно ответа после TTS-вопроса по 422 ingest. */
const INGEST_CLARIFY_COMMAND_MAX_MS = 6500;
const INGEST_CLARIFY_SILENCE_TAIL_MS = 1400;
/** После TTS-вопроса по ingest — пауза, чтобы динамик не «лез» в первый сэмпл STT. */
const INGEST_CLARIFY_POST_TTS_PAUSE_MS = 400;
/** Не запускать coach insight TTS сразу после голосового цикла ingest-уточнения. */
const INGEST_CLARIFY_INSIGHT_COOLDOWN_MS = 2800;

export type LastArenaPostMeta = {
  draftId: string;
  sourceText: string;
  category: string;
  sentiment: LiveTrainingSentiment;
  needsReview: boolean;
  playerId: string | null;
} | null;

/** Payload для голосового уточнения после 422 needs_clarification (POST …/events). */
export type ArenaIngestClarificationVoicePayload = {
  phrase: string;
  sourceType: "manual_stub" | "transcript_segment";
  sentiment: LiveTrainingSentiment;
  category?: string;
  confidence?: number | null;
  candidates: ClarificationVoiceCandidate[];
  speechResolution?: LiveTrainingSpeechResolutionPayload;
  serverMessage: string;
};

/** Результат POST …/events из `postArenaObservation` (голос): не путать с `null` = очередь. */
export type ArenaVoicePostObservationResult =
  | { outcome: "ok"; meta: NonNullable<LastArenaPostMeta> }
  | { outcome: "queued" }
  | { outcome: "needs_clarification"; clarification?: ArenaIngestClarificationVoicePayload };

export type IngestClarificationRetryResult =
  | { status: "posted"; meta: NonNullable<LastArenaPostMeta> }
  | { status: "queued" }
  | { status: "needs_clarification"; clarification: ArenaIngestClarificationVoicePayload }
  | { status: "error"; message: string };

export type UseArenaVoiceAssistantParams = {
  enabled: boolean;
  sessionId: string | undefined;
  isSessionLive: boolean;
  roster: RosterEntry[];
  lastArenaPostRef: MutableRefObject<LastArenaPostMeta>;
  router: { push: (href: Href) => void; replace: (href: Href) => void };
  /** POST события; `needs_clarification` — сервер 422, UI уточняет игрока на live-экране */
  postArenaObservation: (args: {
    rawText: string;
    playerId?: string;
    category?: string;
    sentiment: LiveTrainingSentiment;
    confidence?: number | null;
  }) => Promise<ArenaVoicePostObservationResult>;
  refreshSession: () => Promise<void>;
  finishTrainingVoice: () => Promise<{ ok: boolean; message?: string }>;
  /** UI-таймер live: то же состояние, что кнопка «Пауза» / «Продолжить». */
  pauseTimerVoice: () => Promise<void>;
  resumeTimerVoice: () => Promise<void>;
  deleteDraftById: (draftId: string) => Promise<void>;
  patchDraftPlayer: (
    draftId: string,
    playerId: string,
    fields: {
      sourceText: string;
      category: string;
      sentiment: LiveTrainingSentiment;
      needsReview: boolean;
    }
  ) => Promise<void>;
  /** Лента GET …/events (обновлять ref при каждом loadEvents) — для локальных инсайтов */
  eventsRef?: MutableRefObject<LiveTrainingEventItem[]>;
  sessionRef?: MutableRefObject<LiveTrainingSession | null>;
  /** Контекст слота расписания (группа / вся команда) для фраз Арены. */
  scheduleArenaContext?: ArenaScheduleSlotContext | null;
  /** Повтор POST …/events после выбора игрока (422 → explicit playerId). */
  retryIngestClarificationWithPlayerId: (
    payload: ArenaIngestClarificationVoicePayload,
    playerId: string
  ) => Promise<IngestClarificationRetryResult>;
  /** Сброс экранного fallback `arenaIngestClarification` в live.tsx */
  clearIngestClarificationUi: () => void;
};

export type ArenaClarifyPhase = "none" | "player" | "target" | "meaning";

export type ArenaPersistenceBridge = {
  notifyOutboxFlushStarted: () => void;
  notifyOutboxFlushFinished: () => void;
};

export type UseArenaVoiceAssistantResult = {
  uiPhase: ArenaAssistantUiPhase;
  clarifyPhase: ArenaClarifyPhase;
  /** PHASE 1: coarse agent lifecycle (mic/NLP/clarify), not product intent. */
  orchestratorPhase: ArenaOrchestratorPhase;
  /** Serial utterance backlog (final STT jobs waiting for the interpreter). */
  arenaUtteranceQueueDepth: number;
  lastTranscript: string;
  lastIntent: ArenaParsedIntent | null;
  /** Rule-based intent V1 (parse-arena-intent); не заменяет lastIntent / parseArenaCommand. */
  lastArenaIntentV1: ArenaIntent | null;
  error: string | null;
  isSpeechAvailable: boolean;
  clearError: () => void;
  /** PHASE 2: live screen calls into flush lifecycle so coarse phase matches transport. */
  persistenceBridge: ArenaPersistenceBridge;
};

type InternalPhase = "idle" | "listening" | "processing";

/** STT-мусор: не озвучивать unknown и не показывать alert (второй проход после «Не разобрала» и т.п.). */
function shouldSuppressUnknownArenaSttTts(gnorm: string): boolean {
  const t = gnorm.trim();
  if (!t) return true;
  if (/бэкслэш|бэкслеш|бекслеш|бекспейс|бэк\s*slash/i.test(t)) return true;
  if (!/[а-яё]{2,}/i.test(t) && t.length < 28) return true;
  return false;
}

const RE_ARENA_STT_GARBAGE_WORDS =
  /бэкслэш|бэкслеш|бекслеш|бекспейс|бэк\s*slash|backslash|бек\s*спейс/i;

/**
 * Шум STT до parseArenaCommand: без parse / executeIntent / TTS / alert.
 * `normalizedFull` — результат {@link normalizeArenaTranscript} для полного транскрипта.
 */
function isGarbageTranscript(rawText: string, normalizedFull: string): boolean {
  const n = normalizedFull.trim();
  if (n.length < 3) return true;
  if (RE_ARENA_STT_GARBAGE_WORDS.test(`${rawText}\n${n}`)) return true;
  if (!/[а-яё]/i.test(n)) return true;
  if (!/\p{L}\p{L}/u.test(n)) return true;
  return false;
}

function arenaFirstName(name: string): string {
  const t = name.trim().split(/\s+/)[0];
  return t || name;
}

function buildIngestClarifyQuestionForTts(payload: ArenaIngestClarificationVoicePayload): string {
  const c = payload.candidates;
  if (c.length === 2) return buildArenaTtsIngestClarifyTwo(c[0]!.name, c[1]!.name);
  if (c.length === 1) {
    const t = payload.serverMessage.trim();
    return t.length > 0 ? t : ARENA_TTS_INGEST_CLARIFY_MANY;
  }
  return ARENA_TTS_INGEST_CLARIFY_MANY;
}

type IngestVoiceClarifyRefState =
  | { kind: "idle" }
  | {
      kind: "awaiting_answer";
      sessionId: string;
      payload: ArenaIngestClarificationVoicePayload;
      unclearAttempts: number;
    };

function prefixedArenaObservationRaw(
  intent:
    | { kind: "create_player_observation"; rawText: string }
    | { kind: "create_team_observation"; rawText: string }
    | { kind: "create_session_observation"; rawText: string }
): string {
  if (intent.kind === "create_team_observation") return `[Команда] ${intent.rawText}`;
  if (intent.kind === "create_session_observation") return `[Сессия] ${intent.rawText}`;
  return intent.rawText;
}

export function useArenaVoiceAssistant(
  params: UseArenaVoiceAssistantParams
): UseArenaVoiceAssistantResult {
  const {
    enabled,
    sessionId,
    isSessionLive,
    roster,
    lastArenaPostRef,
    router,
    postArenaObservation,
    refreshSession,
    finishTrainingVoice,
    pauseTimerVoice,
    resumeTimerVoice,
    deleteDraftById,
    patchDraftPlayer,
    eventsRef: eventsRefParam,
    sessionRef: sessionRefParam,
    scheduleArenaContext,
    retryIngestClarificationWithPlayerId,
    clearIngestClarificationUi,
  } = params;

  const [uiPhase, setUiPhase] = useState<ArenaAssistantUiPhase>("idle");
  const [clarifyPhase, setClarifyPhase] = useState<ArenaClarifyPhase>("none");
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastIntent, setLastIntent] = useState<ArenaParsedIntent | null>(null);
  const [lastArenaIntentV1, setLastArenaIntentV1] = useState<ArenaIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeechAvailable, setIsSpeechAvailable] = useState(() => {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  });

  const mountedRef = useRef(true);
  const phaseRef = useRef<InternalPhase>("idle");
  const recognizerActiveRef = useRef(false);
  const commandTextRef = useRef("");
  const finalizeLockRef = useRef(false);
  const commandMaxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSilenceIdlePromptAtRef = useRef(0);
  const silenceIdleRoundRef = useRef(0);
  const lastWakeAtRef = useRef(0);
  const lastVoiceExecutedNormRef = useRef("");
  const lastVoiceExecutedAtRef = useRef(0);
  const lastCoachInsightSpeakAtRef = useRef(0);
  const lastVolumeLoudAtRef = useRef(0);
  const rosterRef = useRef(roster);
  const arenaPipelineEntryRef = useRef<"wake_listen" | "idle_continuous_final">("wake_listen");
  const contextStoreRef = useRef(new ArenaSessionContextStore());
  const [orchestratorPhase, setOrchestratorPhase] = useState<ArenaOrchestratorPhase>("idle");
  const [arenaUtteranceQueueDepth, setArenaUtteranceQueueDepth] = useState(0);
  const orchestrator = useMemo(
    () =>
      new ArenaSessionOrchestrator((p) => {
        setOrchestratorPhase(p);
      }),
    []
  );
  const listeningTransport = useMemo(
    () => createExpoSpeechArenaListeningTransport(ExpoSpeechRecognitionModule),
    []
  );
  const listeningHandlersRef = useRef<ArenaListeningAdapterHandlers>({
    onTranscriptSegment: () => {},
    onListeningStateChange: () => {},
    onError: () => {},
  });
  const conversationContextRef = useRef(createEmptyArenaConversationContext());
  const pendingClarificationRef = useRef(createIdleArenaPendingClarification());
  const clarifyActivatedRef = useRef(false);
  const ingestVoiceClarifyRef = useRef<IngestVoiceClarifyRefState>({ kind: "idle" });
  const ingestVoiceClarifyFlowActiveRef = useRef(false);
  const ingestInsightCooldownUntilRef = useRef(0);
  const utteranceQueueRef = useRef<ArenaLiveUtteranceJob[]>([]);
  const lastParserClarifyPromptNormRef = useRef("");
  const tryScheduleDrainUtteranceQueueRef = useRef<() => void>(() => {});

  const clearPendingClarification = useCallback(() => {
    pendingClarificationRef.current = createIdleArenaPendingClarification();
    setClarifyPhase("none");
    contextStoreRef.current.clearClarification();
    lastParserClarifyPromptNormRef.current = "";
  }, []);
  type ParamsRef = UseArenaVoiceAssistantParams & {
    sessionId: string | undefined;
    enabled: boolean;
    isSessionLive: boolean;
    eventsRef?: MutableRefObject<LiveTrainingEventItem[]>;
    sessionRef?: MutableRefObject<LiveTrainingSession | null>;
    scheduleArenaContext?: ArenaScheduleSlotContext | null;
    retryIngestClarificationWithPlayerId: UseArenaVoiceAssistantParams["retryIngestClarificationWithPlayerId"];
    clearIngestClarificationUi: UseArenaVoiceAssistantParams["clearIngestClarificationUi"];
  };
  const paramsRef = useRef<ParamsRef>(null!);
  paramsRef.current = {
    ...params,
    sessionId,
    enabled,
    isSessionLive,
    eventsRef: eventsRefParam,
    sessionRef: sessionRefParam,
    scheduleArenaContext: scheduleArenaContext ?? null,
    retryIngestClarificationWithPlayerId,
    clearIngestClarificationUi,
  };
  rosterRef.current = roster;

  const speechRecognitionAvailable = useCallback((): boolean => {
    try {
      return listeningTransport.isRecognitionAvailable();
    } catch {
      return false;
    }
  }, [listeningTransport]);

  useEffect(() => {
    const s = paramsRef.current.sessionRef?.current ?? null;
    const groupId =
      s?.groupContextSignalRollup?.canonicalGroupId ??
      s?.groupContextStampDiagnostic?.canonicalGroupId ??
      null;
    const ps = s?.planningSnapshot;
    const liveFocusLabel =
      ps?.summaryLines?.find((line) => line.trim().length > 0)?.trim() ??
      ps?.startPriorities?.summaryLine?.trim() ??
      null;
    contextStoreRef.current.setSessionContext({
      sessionId: sessionId ?? null,
      teamId: s?.teamId ?? null,
      groupId,
      liveFocusLabel,
    });
    contextStoreRef.current.updateRosterContext(roster);
  }, [sessionId, roster, isSessionLive]);

  const clearTimers = useCallback(() => {
    if (commandMaxTimerRef.current) {
      clearTimeout(commandMaxTimerRef.current);
      commandMaxTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (idleRestartTimerRef.current) {
      clearTimeout(idleRestartTimerRef.current);
      idleRestartTimerRef.current = null;
    }
    if (silenceIdleTimerRef.current) {
      clearTimeout(silenceIdleTimerRef.current);
      silenceIdleTimerRef.current = null;
    }
  }, []);

  const hardStopRecognizer = useCallback(() => {
    listeningTransport.abortListening();
    recognizerActiveRef.current = false;
  }, [listeningTransport]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingClarificationRef.current = createIdleArenaPendingClarification();
      ingestVoiceClarifyFlowActiveRef.current = false;
      ingestVoiceClarifyRef.current = { kind: "idle" };
      clearTimers();
      hardStopRecognizer();
      stopArenaSpeech();
    };
  }, [clearTimers, hardStopRecognizer]);

  useEffect(() => {
    conversationContextRef.current = createEmptyArenaConversationContext();
    clearPendingClarification();
    ingestVoiceClarifyFlowActiveRef.current = false;
    ingestVoiceClarifyRef.current = { kind: "idle" };
    paramsRef.current.clearIngestClarificationUi();
    lastVoiceExecutedNormRef.current = "";
    lastVoiceExecutedAtRef.current = 0;
    utteranceQueueRef.current = [];
    lastParserClarifyPromptNormRef.current = "";
    if (mountedRef.current) setArenaUtteranceQueueDepth(0);
    orchestrator.reset();
  }, [sessionId, clearPendingClarification, orchestrator]);

  useEffect(() => {
    setIsSpeechAvailable(speechRecognitionAvailable());
  }, [enabled, speechRecognitionAvailable]);

  const setPhase = useCallback((p: InternalPhase) => {
    phaseRef.current = p;
    if (!mountedRef.current) return;
    if (p === "idle") setUiPhase("idle");
    else if (p === "listening") setUiPhase("listening");
    else setUiPhase("processing");
  }, []);

  const scheduleIdleRestart = useCallback(() => {
    clearTimers();
    const pr = paramsRef.current;
    if (!mountedRef.current || !pr.enabled || !pr.sessionId || !pr.isSessionLive) return;
    idleRestartTimerRef.current = setTimeout(() => {
      idleRestartTimerRef.current = null;
      if (!mountedRef.current || phaseRef.current !== "idle") return;
      void startIdleRecognitionRef.current();
    }, IDLE_RESTART_MS);
  }, [clearTimers]);

  const scheduleSilenceIdlePrompt = useCallback(() => {
    if (silenceIdleTimerRef.current) {
      clearTimeout(silenceIdleTimerRef.current);
      silenceIdleTimerRef.current = null;
    }
    const pr = paramsRef.current;
    if (!mountedRef.current || !pr.enabled || !pr.sessionId || !pr.isSessionLive) return;
    silenceIdleTimerRef.current = setTimeout(() => {
      silenceIdleTimerRef.current = null;
      if (!mountedRef.current || phaseRef.current !== "idle") return;
      const now = Date.now();
      if (now - lastSilenceIdlePromptAtRef.current < ARENA_SILENCE_IDLE_MIN_GAP_MS) return;
      lastSilenceIdlePromptAtRef.current = now;
      const sid = pr.sessionId!;
      void speakArenaShort(
        pickSilenceIdlePrompt(
          sid,
          silenceIdleRoundRef.current,
          pr.scheduleArenaContext ?? undefined
        )
      );
      silenceIdleRoundRef.current += 1;
    }, ARENA_SILENCE_IDLE_MS);
  }, []);

  const scheduleSilenceIdlePromptRef = useRef(scheduleSilenceIdlePrompt);
  scheduleSilenceIdlePromptRef.current = scheduleSilenceIdlePrompt;

  const syncArenaUtteranceQueueDepth = useCallback(() => {
    if (!mountedRef.current) return;
    setArenaUtteranceQueueDepth(utteranceQueueRef.current.length);
  }, []);

  const enqueueArenaLiveUtterance = useCallback(
    (rawText: string, pipelineEntry: ArenaLiveUtterancePipelineEntry) => {
      const t = rawText.trim();
      if (!t) return;
      const normFull = normalizeArenaTranscript(t);
      if (isGarbageTranscript(t, normFull)) return;
      const { queue, droppedCount } = arenaLiveUtteranceQueuePush(utteranceQueueRef.current, {
        text: t,
        pipelineEntry,
        enqueuedAt: Date.now(),
      });
      utteranceQueueRef.current = queue;
      if (droppedCount > 0 && __DEV__) {
        console.warn("[arena] utterance queue dropped oldest jobs", { droppedCount });
      }
      syncArenaUtteranceQueueDepth();
    },
    [syncArenaUtteranceQueueDepth]
  );

  const emitCoachInsightIfNeededRef = useRef<() => void>(() => {});

  const emitCoachInsightIfNeeded = useCallback(() => {
    /** Heuristic TTS from already-loaded server events only — not autonomous “game state” inference. */
    if (ingestVoiceClarifyFlowActiveRef.current) return;
    if (Date.now() < ingestInsightCooldownUntilRef.current) return;
    const pr = paramsRef.current;
    const evs = pr.eventsRef?.current;
    if (!evs || evs.length === 0) return;
    const sched = pr.scheduleArenaContext;
    const groupLabel =
      sched?.groupId && sched.groupName?.trim() ? sched.groupName.trim() : null;
    const groupContext: LiveCoachInsightContext | null =
      groupLabel && rosterRef.current.length > 0
        ? {
            groupRosterPlayerIds: rosterRef.current.map((r) => r.id),
            groupLabel,
          }
        : null;
    const insight = evaluateLiveCoachInsights(
      evs,
      pr.sessionRef?.current ?? null,
      groupContext
    );
    if (!insight) return;
    const now = Date.now();
    if (now - lastCoachInsightSpeakAtRef.current < COACH_INSIGHT_COOLDOWN_MS) return;
    lastCoachInsightSpeakAtRef.current = now;
    const tts = buildInsightTts(insight);
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (ingestVoiceClarifyFlowActiveRef.current) return;
      if (Date.now() < ingestInsightCooldownUntilRef.current) return;
      if (phaseRef.current === "listening") return;
      void speakArenaShort(tts);
    }, COACH_INSIGHT_DELAY_AFTER_OBS_MS);
  }, []);

  emitCoachInsightIfNeededRef.current = emitCoachInsightIfNeeded;

  const startIdleRecognitionRef = useRef<() => Promise<void>>(async () => {});
  const startClarifyCaptureRef = useRef<() => Promise<void>>(async () => {});

  const endIngestVoiceAndResumeIdle = useCallback(() => {
    ingestVoiceClarifyFlowActiveRef.current = false;
    ingestVoiceClarifyRef.current = { kind: "idle" };
    ingestInsightCooldownUntilRef.current = Date.now() + INGEST_CLARIFY_INSIGHT_COOLDOWN_MS;
    paramsRef.current.clearIngestClarificationUi();
    contextStoreRef.current.clearClarification();
    orchestrator.notifyInterpretationPipelineFinished("idle");
    scheduleIdleRestart();
    scheduleSilenceIdlePrompt();
    tryScheduleDrainUtteranceQueueRef.current();
  }, [scheduleIdleRestart, scheduleSilenceIdlePrompt, orchestrator]);

  const finalizeCommandListening = useCallback(
    async (
      reason: string,
      options?: {
        fromQueueDrain?: boolean;
        overrideText?: string;
        overridePipelineEntry?: ArenaLiveUtterancePipelineEntry;
      }
    ) => {
      const fromQueueDrain = options?.fromQueueDrain === true;
      const overrideText = options?.overrideText;
      const pipelineForEnqueue =
        options?.overridePipelineEntry ?? arenaPipelineEntryRef.current;

      if (finalizeLockRef.current && !fromQueueDrain) {
        const tq = (overrideText ?? commandTextRef.current).trim();
        if (tq) {
          enqueueArenaLiveUtterance(tq, pipelineForEnqueue);
        }
        return;
      }

      if (!fromQueueDrain && phaseRef.current !== "listening") return;

      finalizeLockRef.current = true;
      clearTimers();
      if (!fromQueueDrain) {
        hardStopRecognizer();
      }

      const text = (overrideText ?? commandTextRef.current).trim();
      commandTextRef.current = "";
      if (mountedRef.current) setLastTranscript(text);

      const pipelineEntryForRun = arenaPipelineEntryRef.current;
      arenaPipelineEntryRef.current = "wake_listen";

      const skipStopForIngestClarify =
        ingestVoiceClarifyRef.current.kind === "awaiting_answer";
      const skipStopSound =
        skipStopForIngestClarify ||
        pipelineEntryForRun === "idle_continuous_final" ||
        reason === "queue_drain";
      if (!skipStopSound) {
        try {
          await playArenaStopSound();
        } catch {
          /* ignore */
        }
      }

      if (!mountedRef.current) {
        finalizeLockRef.current = false;
        return;
      }

      setPhase("processing");
      orchestrator.notifyInterpretationPipelineStarted();

      const executeIntent = async (intent: ArenaParsedIntent) => {
        const p = paramsRef.current;
        try {
          switch (intent.kind) {
            case "start_session": {
              if (p.isSessionLive) {
                void speakArenaShort(ARENA_TTS_SESSION_ALREADY_LIVE);
                Alert.alert(ARENA_ALERT_TITLE, ARENA_ALERT_SESSION_ALREADY_LIVE);
              } else {
                p.router.push("/live-training/start");
              }
              break;
            }
            case "finish_session": {
              if (__DEV__) {
                console.log("[arena-finish-debug] executeIntent finish_session -> finishTrainingVoice");
              }
              const r = await p.finishTrainingVoice();
              if (__DEV__) {
                console.log("[arena-finish-debug] finishTrainingVoice result", r);
              }
              if (!mountedRef.current) return;
              if (!r.ok && r.message) {
                void speakArenaShort(ARENA_TTS_FINISH_FAILED);
                Alert.alert(ARENA_ALERT_TITLE, r.message);
              } else if (r.ok) {
                orchestrator.notifySessionCompleted();
              }
              break;
            }
            case "pause_timer": {
              await p.pauseTimerVoice();
              void speakArenaShort(ARENA_TTS_TIMER_PAUSED);
              break;
            }
            case "resume_timer": {
              await p.resumeTimerVoice();
              void speakArenaShort(ARENA_TTS_TIMER_RESUMED);
              break;
            }
            case "resume_session": {
              await p.refreshSession();
              void speakArenaShort(ARENA_TTS_REFRESHED);
              break;
            }
            case "delete_last_observation": {
              const meta = p.lastArenaPostRef.current;
              if (!meta?.draftId) {
                void speakArenaShort(ARENA_TTS_DELETE_NOTHING);
                Alert.alert(ARENA_ALERT_TITLE, ARENA_ALERT_DELETE_NOTHING);
              } else {
                await p.deleteDraftById(meta.draftId);
                if (mountedRef.current) {
                  p.lastArenaPostRef.current = null;
                  conversationContextRef.current = arenaContextAfterDelete(conversationContextRef.current);
                  void speakArenaShort(ARENA_TTS_DELETED_LAST);
                }
              }
              break;
            }
            case "reassign_last_observation": {
              const meta = p.lastArenaPostRef.current;
              if (!meta?.draftId) {
                void speakArenaShort(ARENA_TTS_REASSIGN_NO_DRAFT);
                Alert.alert(ARENA_ALERT_TITLE, ARENA_ALERT_REASSIGN_NO_DRAFT);
                break;
              }
              const pl = matchRosterHint(intent.playerHint, rosterRef.current);
              if (!pl) {
                void speakArenaShort(ARENA_TTS_PLAYER_NOT_FOUND);
                Alert.alert(
                  ARENA_ALERT_TITLE,
                  ARENA_ALERT_PLAYER_NOT_FOUND(intent.playerHint)
                );
                break;
              }
              await p.patchDraftPlayer(meta.draftId, pl.id, {
                sourceText: meta.sourceText,
                category: meta.category,
                sentiment: meta.sentiment,
                needsReview: meta.needsReview,
              });
              if (mountedRef.current) {
                p.lastArenaPostRef.current = {
                  ...meta,
                  playerId: pl.id,
                };
                conversationContextRef.current = arenaContextAfterReassignPlayer(
                  conversationContextRef.current,
                  pl
                );
                void speakArenaShort(ARENA_TTS_REASSIGNED(arenaFirstName(pl.name)));
              }
              break;
            }
            case "create_player_observation":
            case "create_team_observation":
            case "create_session_observation": {
              const persistVerdict = evaluateArenaSafeAutoPersistForVoiceIntent(intent);
              contextStoreRef.current.setLastSafeAutoPersistVerdict(persistVerdict);
              const postRes = await p.postArenaObservation({
                rawText: prefixedArenaObservationRaw(intent),
                playerId: intent.kind === "create_player_observation" ? intent.playerId : undefined,
                category: intent.category,
                sentiment: intent.sentiment,
                confidence: intent.confidence,
              });
              if (!mountedRef.current) break;
              if (postRes.outcome === "needs_clarification") {
                if (postRes.clarification) {
                  if (__DEV__) {
                    console.log("[useArenaVoiceAssistant] ingest needs_clarification — voice loop");
                  }
                  contextStoreRef.current.setPendingClarification({
                    kind: "ingest_voice",
                    phrase: postRes.clarification.phrase,
                    createdAt: Date.now(),
                  });
                  ingestVoiceClarifyFlowActiveRef.current = true;
                  void runIngestClarifySequenceRef.current(postRes.clarification);
                } else if (__DEV__) {
                  console.log("[useArenaVoiceAssistant] ingest needs_clarification — no clarification payload");
                }
                break;
              }
              const targetType =
                intent.kind === "create_player_observation"
                  ? ("player" as const)
                  : intent.kind === "create_team_observation"
                    ? ("team" as const)
                    : ("session" as const);
              const resolvedPlayerName =
                intent.kind === "create_player_observation"
                  ? rosterRef.current.find((x) => x.id === intent.playerId)?.name ?? null
                  : null;
              if (postRes.outcome === "ok") {
                const meta = postRes.meta;
                contextStoreRef.current.markVoiceObservationHttpAccepted();
                contextStoreRef.current.pushConfirmedEvent({
                  at: Date.now(),
                  source: "voice_post_ok",
                  rawText: intent.rawText,
                  draftId: meta.draftId ?? undefined,
                  playerId: meta.playerId,
                });
                p.lastArenaPostRef.current = meta;
                conversationContextRef.current = arenaContextAfterObservation(
                  conversationContextRef.current,
                  {
                    draftId: meta.draftId,
                    playerId: meta.playerId,
                    playerName: resolvedPlayerName,
                    targetType,
                    domain: intent.domain,
                    skill: intent.skill,
                    rawText: intent.rawText,
                  }
                );
                const ttsSalt = meta.draftId ?? `${intent.rawText}:${Date.now()}`;
                const skipAffirmationTts = persistVerdict.safe === true;
                if (!skipAffirmationTts) {
                  if (intent.kind === "create_player_observation") {
                    void speakArenaShort(
                      pickTtsAfterPlayerObservation(
                        arenaFirstName(resolvedPlayerName ?? "игрок"),
                        ttsSalt
                      )
                    );
                  } else if (intent.kind === "create_team_observation") {
                    void speakArenaShort(
                      pickTtsAfterTeamObservation(
                        ttsSalt,
                        paramsRef.current.scheduleArenaContext ?? undefined
                      )
                    );
                  } else {
                    void speakArenaShort(pickTtsAfterSessionObservation(ttsSalt));
                  }
                }
                emitCoachInsightIfNeededRef.current();
                break;
              }
              if (postRes.outcome === "queued") {
                contextStoreRef.current.markVoiceObservationQueuedTransport();
              }
              conversationContextRef.current = arenaContextAfterObservation(
                conversationContextRef.current,
                {
                  draftId: null,
                  playerId: intent.kind === "create_player_observation" ? intent.playerId : null,
                  playerName: resolvedPlayerName,
                  targetType,
                  domain: intent.domain,
                  skill: intent.skill,
                  rawText: intent.rawText,
                }
              );
              void speakArenaShort(pickTtsQueued(`${intent.kind}:${intent.rawText}`));
              break;
            }
            case "ask_last_observation_status": {
              const phrase = buildLastObservationStatusPhrase(conversationContextRef.current);
              if (!phrase) void speakArenaShort(ARENA_TTS_LAST_EMPTY);
              else void speakArenaShort(phrase);
              break;
            }
            case "unknown": {
              const rawU = intent.rawTranscript ?? "";
              const gnorm = normalizeArenaTranscript(rawU);
              const suppressTts = shouldSuppressUnknownArenaSttTts(gnorm);
              if (__DEV__) {
                console.log("[arena-finish-debug] unknown path", {
                  rawTranscript: rawU,
                  gnorm,
                  suppressUnknownTts: suppressTts,
                });
              }
              if (pipelineEntryForRun === "idle_continuous_final") {
                break;
              }
              if (!suppressTts) {
                void speakArenaShort(ARENA_TTS_UNKNOWN);
                Alert.alert(ARENA_ALERT_TITLE, ARENA_ALERT_UNKNOWN_COMMAND);
              }
              break;
            }
            default:
              break;
          }
        } catch (e) {
          if (!mountedRef.current) return;
          const msg =
            e instanceof Error ? e.message : ARENA_ALERT_COMMAND_FAILED_FALLBACK;
          Alert.alert(ARENA_ALERT_TITLE, msg);
        }
      };

      const run = async () => {
        clarifyActivatedRef.current = false;
        if (text.trim().length > 0) {
          contextStoreRef.current.setLastGroundedInterpretation(
            buildArenaGroundedUtteranceInterpretation({
              rawTranscript: text,
              roster: rosterRef.current,
              conversationCtx: conversationContextRef.current,
            })
          );
        } else {
          contextStoreRef.current.setLastGroundedInterpretation(null);
        }
        const p = paramsRef.current;
        const sid = p.sessionId;

        const hasWake = transcriptContainsWakeWord(text);

        if (ingestVoiceClarifyRef.current.kind === "awaiting_answer") {
          if (!sid || ingestVoiceClarifyRef.current.sessionId !== sid) {
            endIngestVoiceAndResumeIdle();
            return;
          }
          if (hasWake) {
            endIngestVoiceAndResumeIdle();
            return;
          }
          if (!text) {
              const ing0 = ingestVoiceClarifyRef.current;
              if (ing0.kind === "awaiting_answer") {
                if (ing0.unclearAttempts >= 1) {
                  void speakArenaShort(ARENA_TTS_INGEST_CLARIFY_GIVE_UP);
                  endIngestVoiceAndResumeIdle();
                  return;
                }
                ingestVoiceClarifyRef.current = {
                  ...ing0,
                  unclearAttempts: ing0.unclearAttempts + 1,
                };
                await speakArenaShort(ARENA_TTS_INGEST_CLARIFY_REPEAT);
                await new Promise<void>((r) => setTimeout(r, INGEST_CLARIFY_POST_TTS_PAUSE_MS));
                await startIngestClarifyListeningRef.current();
              }
              return;
            }

            const normIngest = normalizeArenaTranscript(text);
            if (isGarbageTranscript(text, normIngest)) {
              const ingG = ingestVoiceClarifyRef.current;
              if (ingG.kind === "awaiting_answer") {
                if (ingG.unclearAttempts >= 1) {
                  void speakArenaShort(ARENA_TTS_INGEST_CLARIFY_GIVE_UP);
                  endIngestVoiceAndResumeIdle();
                  return;
                }
                ingestVoiceClarifyRef.current = {
                  ...ingG,
                  unclearAttempts: ingG.unclearAttempts + 1,
                };
                await speakArenaShort(ARENA_TTS_INGEST_CLARIFY_REPEAT);
                await new Promise<void>((r) => setTimeout(r, INGEST_CLARIFY_POST_TTS_PAUSE_MS));
                await startIngestClarifyListeningRef.current();
              }
              return;
            }

            const ing = ingestVoiceClarifyRef.current;
            if (ing.kind !== "awaiting_answer") return;
            const voiceAnswer = resolveClarificationVoiceAnswer(text, ing.payload.candidates);
            if (voiceAnswer.kind === "cancelled") {
              void speakArenaShort(ARENA_TTS_CLARIFY_CANCELLED);
              endIngestVoiceAndResumeIdle();
              return;
            }
            if (voiceAnswer.kind === "retry") {
              if (ing.unclearAttempts >= 1) {
                void speakArenaShort(ARENA_TTS_INGEST_CLARIFY_GIVE_UP);
                endIngestVoiceAndResumeIdle();
                return;
              }
              ingestVoiceClarifyRef.current = {
                ...ing,
                unclearAttempts: ing.unclearAttempts + 1,
              };
              await speakArenaShort(ARENA_TTS_INGEST_CLARIFY_REPEAT);
              await new Promise<void>((r) => setTimeout(r, INGEST_CLARIFY_POST_TTS_PAUSE_MS));
              await startIngestClarifyListeningRef.current();
              return;
            }

            const retryRes = await p.retryIngestClarificationWithPlayerId(
              ing.payload,
              voiceAnswer.playerId
            );
            if (!mountedRef.current) return;
            if (retryRes.status === "posted") {
              const meta = retryRes.meta;
              contextStoreRef.current.markVoiceObservationHttpAccepted();
              contextStoreRef.current.pushConfirmedEvent({
                at: Date.now(),
                source: "ingest_clarify_retry_ok",
                rawText: ing.payload.phrase,
                draftId: meta.draftId ?? undefined,
                playerId: meta.playerId,
              });
              contextStoreRef.current.resolveClarification();
              p.lastArenaPostRef.current = meta;
              const rosterRow = rosterRef.current.find((x) => x.id === meta.playerId);
              const resolvedPlayerName = rosterRow?.name ?? null;
              conversationContextRef.current = arenaContextAfterObservation(
                conversationContextRef.current,
                {
                  draftId: meta.draftId,
                  playerId: meta.playerId,
                  playerName: resolvedPlayerName,
                  targetType: meta.playerId ? "player" : "session",
                  domain: null,
                  skill: null,
                  rawText: ing.payload.phrase,
                }
              );
              void speakArenaShort(ARENA_TTS_SAVED_PLAYER(arenaFirstName(resolvedPlayerName ?? "игрок")));
              endIngestVoiceAndResumeIdle();
              emitCoachInsightIfNeededRef.current();
              return;
            }
            if (retryRes.status === "queued") {
              contextStoreRef.current.markVoiceObservationQueuedTransport();
              void speakArenaShort(ARENA_TTS_INGEST_QUEUED);
              endIngestVoiceAndResumeIdle();
              return;
            }
            if (retryRes.status === "needs_clarification") {
              contextStoreRef.current.setPendingClarification({
                kind: "ingest_voice",
                phrase: retryRes.clarification.phrase,
                createdAt: Date.now(),
              });
              ingestVoiceClarifyFlowActiveRef.current = true;
              void runIngestClarifySequenceRef.current(retryRes.clarification);
              return;
            }
            void speakArenaShort(ARENA_TTS_UNKNOWN);
            Alert.alert(ARENA_ALERT_TITLE, retryRes.message);
            endIngestVoiceAndResumeIdle();
            return;
        }

        if (!text) {
          if (pendingClarificationRef.current.kind === "awaiting_followup") {
            const pend = pendingClarificationRef.current;
            const nextRetry = pend.retryCount + 1;
            if (nextRetry >= ARENA_CLARIFY_MAX_FAILURES) {
              clearPendingClarification();
              void speakArenaShort(ARENA_TTS_CLARIFY_GIVE_UP);
              return;
            }
            pendingClarificationRef.current = { ...pend, retryCount: nextRetry };
            const promptNorm = normalizeArenaTranscript(pend.prompt);
            if (promptNorm !== lastParserClarifyPromptNormRef.current) {
              lastParserClarifyPromptNormRef.current = promptNorm;
              void speakArenaShort(pend.prompt);
            }
            clarifyActivatedRef.current = true;
            return;
          }
          if (pipelineEntryForRun === "idle_continuous_final") {
            return;
          }
          if (mountedRef.current) {
            Alert.alert(ARENA_ALERT_TITLE, ARENA_ALERT_EMPTY_TRANSCRIPT);
          }
          return;
        }

        const normFull = normalizeArenaTranscript(text);
        const nowTs = Date.now();
        if (
          normFull &&
          normFull === lastVoiceExecutedNormRef.current &&
          nowTs - lastVoiceExecutedAtRef.current < ANTI_REPEAT_WINDOW_MS
        ) {
          if (__DEV__) {
            console.log("[arena-finish-debug] garbage-guard anti-repeat", { reason, text, normFull });
          }
          return;
        }
        if (isGarbageTranscript(text, normFull)) {
          if (__DEV__) {
            console.log("[arena] garbage filtered", { text });
          }
          return;
        }

        if (
          pipelineEntryForRun === "idle_continuous_final" &&
          !transcriptContainsWakeWord(text)
        ) {
          const probe = parseArenaCommand(text, rosterRef.current, conversationContextRef.current);
          if (probe.ok && isArenaControlIntentRequiringWake(probe.intent)) {
            lastVoiceExecutedNormRef.current = normFull;
            lastVoiceExecutedAtRef.current = nowTs;
            return;
          }
          if (probe.ok && probe.intent.kind === "unknown") {
            lastVoiceExecutedNormRef.current = normFull;
            lastVoiceExecutedAtRef.current = nowTs;
            return;
          }
        }

        const rosterForIntentV1 = rosterRef.current.map((r) => ({
          id: r.id,
          name: r.name,
          jerseyNumber: (r as { jerseyNumber?: number }).jerseyNumber,
        }));
        const arenaIntentV1 = parseArenaIntent({ transcript: text, roster: rosterForIntentV1 });
        if (mountedRef.current) setLastArenaIntentV1(arenaIntentV1);

        if (sid && pendingClarificationRef.current.kind === "awaiting_followup") {
          if (isArenaPendingClarificationStale(pendingClarificationRef.current, Date.now(), sid)) {
            clearPendingClarification();
          }
        }

        if (pendingClarificationRef.current.kind === "awaiting_followup" && hasWake) {
          clearPendingClarification();
        }

        if (pendingClarificationRef.current.kind === "awaiting_followup" && !hasWake) {
          const pend = pendingClarificationRef.current;
          const resolved = resolveArenaClarificationFollowUp({
            followUpRaw: text,
            pending: pend,
            roster: rosterRef.current,
            conversationCtx: conversationContextRef.current,
          });
          if (resolved.kind === "cancelled") {
            clearPendingClarification();
            void speakArenaShort(ARENA_TTS_CLARIFY_CANCELLED);
            return;
          }
          if (resolved.kind === "retry") {
            const nextRetry = pend.retryCount + 1;
            if (nextRetry >= ARENA_CLARIFY_MAX_FAILURES) {
              clearPendingClarification();
              void speakArenaShort(ARENA_TTS_CLARIFY_GIVE_UP);
              return;
            }
            pendingClarificationRef.current = { ...pend, retryCount: nextRetry };
            const hintNorm = normalizeArenaTranscript(resolved.followUpHint);
            if (hintNorm !== lastParserClarifyPromptNormRef.current) {
              lastParserClarifyPromptNormRef.current = hintNorm;
              void speakArenaShort(resolved.followUpHint);
            }
            clarifyActivatedRef.current = true;
            return;
          }
          contextStoreRef.current.resolveClarification();
          clearPendingClarification();
          if (mountedRef.current) setLastIntent(resolved.intent);
          await executeIntent(resolved.intent);
          return;
        }

        const cmdAfterWake = stripWakeWordFromTranscript(text);
        const nParsed = normalizeArenaText(cmdAfterWake);
        if (__DEV__) {
          console.log("[arena-finish-debug] pre-parse", {
            reason,
            rawTranscript: text,
            cmdAfterWake,
            nParsed,
          });
        }

        const parsed = parseArenaCommand(text, rosterRef.current, conversationContextRef.current);
        if (__DEV__) {
          console.log("[arena-finish-debug] post-parse", {
            ok: parsed.ok,
            intent: parsed.ok ? parsed.intent.kind : parsed.clarificationType,
          });
        }
        if (!parsed.ok) {
          if (!sid) return;
          lastParserClarifyPromptNormRef.current = normalizeArenaTranscript(parsed.prompt);
          void speakArenaShort(parsed.prompt);
          Alert.alert(ARENA_ALERT_TITLE, parsed.prompt);
          pendingClarificationRef.current = {
            kind: "awaiting_followup",
            sessionId: sid,
            clarificationType: parsed.clarificationType,
            prompt: parsed.prompt,
            pendingObservation: parsed.pendingObservation,
            candidates: parsed.candidates,
            retryCount: 0,
            createdAt: Date.now(),
          };
          contextStoreRef.current.setPendingClarification({
            kind: "parser_followup",
            clarificationType: parsed.clarificationType,
            createdAt: Date.now(),
          });
          setClarifyPhase(parsed.clarificationType);
          clarifyActivatedRef.current = true;
          return;
        }

        const intent = parsed.intent;
        if (mountedRef.current) setLastIntent(intent);
        lastVoiceExecutedNormRef.current = normFull;
        lastVoiceExecutedAtRef.current = nowTs;
        await executeIntent(intent);
      };

      try {
        await run();
      } finally {
        finalizeLockRef.current = false;
        if (!mountedRef.current) return;
        if (ingestVoiceClarifyFlowActiveRef.current) {
          setPhase("idle");
          return;
        }
        if (clarifyActivatedRef.current) {
          setPhase("idle");
          orchestrator.notifyInterpretationPipelineFinished("clarifying");
          void startClarifyCaptureRef.current();
        } else {
          setPhase("idle");
          orchestrator.notifyInterpretationPipelineFinished("idle");
          scheduleIdleRestart();
          scheduleSilenceIdlePrompt();
        }
        tryScheduleDrainUtteranceQueueRef.current();
      }
    },
    [
      clearTimers,
      hardStopRecognizer,
      scheduleIdleRestart,
      scheduleSilenceIdlePrompt,
      setPhase,
      clearPendingClarification,
      endIngestVoiceAndResumeIdle,
      orchestrator,
      enqueueArenaLiveUtterance,
    ]
  );

  const finalizeCommandListeningRef = useRef(finalizeCommandListening);
  finalizeCommandListeningRef.current = finalizeCommandListening;

  const tryScheduleDrainUtteranceQueue = useCallback(() => {
    if (ingestVoiceClarifyFlowActiveRef.current) return;
    if (pendingClarificationRef.current.kind === "awaiting_followup") return;
    if (contextStoreRef.current.getSnapshot().outboxFlushInFlight) return;
    if (finalizeLockRef.current) return;
    if (utteranceQueueRef.current.length === 0) return;
    const job = utteranceQueueRef.current.shift();
    if (!job) return;
    syncArenaUtteranceQueueDepth();
    commandTextRef.current = job.text;
    arenaPipelineEntryRef.current = job.pipelineEntry;
    queueMicrotask(() => {
      void finalizeCommandListeningRef.current("queue_drain", { fromQueueDrain: true });
    });
  }, [syncArenaUtteranceQueueDepth]);

  tryScheduleDrainUtteranceQueueRef.current = tryScheduleDrainUtteranceQueue;

  const startIngestClarifyListeningRef = useRef<() => Promise<void>>(async () => {});

  const startIngestClarifyListening = useCallback(async () => {
    if (!mountedRef.current) return;
    if (ingestVoiceClarifyRef.current.kind !== "awaiting_answer") return;
    if (phaseRef.current !== "idle") return;

    clearTimers();
    hardStopRecognizer();
    phaseRef.current = "listening";
    if (mountedRef.current) setUiPhase("listening");
    commandTextRef.current = "";

    const pr = paramsRef.current;
    if (!pr.enabled || !pr.sessionId) return;

    const st = ingestVoiceClarifyRef.current;
    if (st.kind !== "awaiting_answer") return;
    const { payload } = st;
    const jerseyStrs = payload.candidates
      .map((c) =>
        c.jerseyNumber != null && Number.isFinite(c.jerseyNumber as number)
          ? String(c.jerseyNumber)
          : ""
      )
      .filter(Boolean);
    const ctxStrings = [
      "отмена",
      "не надо",
      "сбрось",
      "первый",
      "второй",
      "третий",
      "первая",
      "вторая",
      "да",
      "нет",
      ...jerseyStrs,
      ...payload.candidates.flatMap((c) =>
        c.name
          .trim()
          .split(/\s+/)
          .filter((p) => p.length >= 2)
      ),
    ].filter((s, i, a) => s && a.indexOf(s) === i).slice(0, 24);

    try {
      const perm = await listeningTransport.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ARENA_ERR_MIC_DENIED);
        endIngestVoiceAndResumeIdle();
        setPhase("idle");
        return;
      }
      setError(null);

      await listeningTransport.startListening({
        lang: RU,
        interimResults: true,
        continuous: false,
        contextualStrings: ctxStrings,
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 120,
        },
      });
      recognizerActiveRef.current = true;
      orchestrator.notifySttListeningStarted("ingest_clarify");
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : ARENA_ERR_CLARIFY_START);
        endIngestVoiceAndResumeIdle();
        setPhase("idle");
      }
      return;
    }

    commandMaxTimerRef.current = setTimeout(() => {
      commandMaxTimerRef.current = null;
      if (phaseRef.current === "listening" && mountedRef.current) {
        void finalizeCommandListeningRef.current("max");
      }
    }, INGEST_CLARIFY_COMMAND_MAX_MS);
  }, [clearTimers, hardStopRecognizer, setPhase, endIngestVoiceAndResumeIdle, listeningTransport, orchestrator]);

  startIngestClarifyListeningRef.current = startIngestClarifyListening;

  const runIngestClarifySequence = useCallback(
    async (payload: ArenaIngestClarificationVoicePayload) => {
      const pr = paramsRef.current;
      const sid = pr.sessionId;
      if (!sid || !pr.enabled || !pr.isSessionLive) {
        ingestVoiceClarifyFlowActiveRef.current = false;
        return;
      }
      clearTimers();
      hardStopRecognizer();
      if (!mountedRef.current) return;
      ingestVoiceClarifyFlowActiveRef.current = true;
      ingestVoiceClarifyRef.current = {
        kind: "awaiting_answer",
        sessionId: sid,
        payload,
        unclearAttempts: 0,
      };
      orchestrator.notifyIngestClarifyTtsStarted();
      try {
        await speakArenaShort(buildIngestClarifyQuestionForTts(payload));
      } catch {
        /* ignore */
      }
      if (!mountedRef.current || ingestVoiceClarifyRef.current.kind !== "awaiting_answer") {
        endIngestVoiceAndResumeIdle();
        return;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, INGEST_CLARIFY_POST_TTS_PAUSE_MS));
      if (!mountedRef.current || ingestVoiceClarifyRef.current.kind !== "awaiting_answer") {
        endIngestVoiceAndResumeIdle();
        return;
      }
      orchestrator.notifyIngestClarifyTtsEnded();
      await startIngestClarifyListeningRef.current();
    },
    [clearTimers, hardStopRecognizer, endIngestVoiceAndResumeIdle, orchestrator]
  );

  const runIngestClarifySequenceRef = useRef(runIngestClarifySequence);
  runIngestClarifySequenceRef.current = runIngestClarifySequence;

  const startClarifyCapture = useCallback(async () => {
    if (!mountedRef.current) return;
    if (pendingClarificationRef.current.kind !== "awaiting_followup") return;
    if (phaseRef.current !== "idle") return;

    clearTimers();
    hardStopRecognizer();
    phaseRef.current = "listening";
    if (mountedRef.current) setUiPhase("listening");
    commandTextRef.current = "";

    if (!mountedRef.current || !paramsRef.current.enabled || !paramsRef.current.sessionId) return;

    try {
      const perm = await listeningTransport.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ARENA_ERR_MIC_DENIED);
        clearPendingClarification();
        setPhase("idle");
        scheduleIdleRestart();
        return;
      }
      setError(null);

      await listeningTransport.startListening({
        lang: RU,
        interimResults: true,
        continuous: false,
        contextualStrings: ["защитник", "нападающий", "про пятёрку", "пятёрка", "отмена"],
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 120,
        },
      });
      recognizerActiveRef.current = true;
      orchestrator.notifySttListeningStarted("parser_clarify");
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : ARENA_ERR_CLARIFY_START);
        clearPendingClarification();
        setPhase("idle");
        scheduleIdleRestart();
      }
      return;
    }

    commandMaxTimerRef.current = setTimeout(() => {
      commandMaxTimerRef.current = null;
      if (phaseRef.current === "listening" && mountedRef.current) {
        void finalizeCommandListeningRef.current("max");
      }
    }, COMMAND_MAX_MS);
  }, [clearTimers, hardStopRecognizer, scheduleIdleRestart, setPhase, clearPendingClarification, listeningTransport, orchestrator]);

  startClarifyCaptureRef.current = startClarifyCapture;

  const bumpSilenceFinalize = useCallback(() => {
    if (phaseRef.current !== "listening") return;
    if (commandTextRef.current.trim().length < 2) return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const tailMs =
      ingestVoiceClarifyRef.current.kind === "awaiting_answer"
        ? INGEST_CLARIFY_SILENCE_TAIL_MS
        : SILENCE_TAIL_MS;
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      if (phaseRef.current === "listening" && mountedRef.current) {
        void finalizeCommandListeningRef.current("silence");
      }
    }, tailMs);
  }, []);

  const onWakeDetected = useCallback(async () => {
    if (!mountedRef.current || phaseRef.current !== "idle") return;
    if (Date.now() - lastWakeAtRef.current < WAKE_COOLDOWN_MS) return;
    lastWakeAtRef.current = Date.now();

    clearTimers();
    hardStopRecognizer();
    phaseRef.current = "listening";
    if (mountedRef.current) setUiPhase("listening");
    commandTextRef.current = "";

    try {
      await playArenaWakeSound();
    } catch {
      /* ignore */
    }

    if (!mountedRef.current || !paramsRef.current.enabled || !paramsRef.current.sessionId) return;

    try {
      const perm = await listeningTransport.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ARENA_ERR_MIC_DENIED);
        setPhase("idle");
        scheduleIdleRestart();
        return;
      }

      await listeningTransport.startListening({
        lang: RU,
        interimResults: true,
        continuous: false,
        contextualStrings: [
          "начать тренировку",
          "закончить тренировку",
          "удали последнее",
          "Марк",
          "Иванов",
        ],
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 120,
        },
      });
      recognizerActiveRef.current = true;
      orchestrator.notifySttListeningStarted("wake_command");
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : ARENA_ERR_LISTEN_START);
        setPhase("idle");
        scheduleIdleRestart();
      }
      return;
    }

    commandMaxTimerRef.current = setTimeout(() => {
      commandMaxTimerRef.current = null;
      if (phaseRef.current === "listening" && mountedRef.current) {
        void finalizeCommandListeningRef.current("max");
      }
    }, COMMAND_MAX_MS);
  }, [clearTimers, hardStopRecognizer, scheduleIdleRestart, setPhase, listeningTransport, orchestrator]);

  const onWakeDetectedRef = useRef(onWakeDetected);
  onWakeDetectedRef.current = onWakeDetected;

  const startIdleRecognition = useCallback(async () => {
    const pr = paramsRef.current;
    if (!mountedRef.current || !pr.enabled || !pr.sessionId || !pr.isSessionLive) return;
    if (phaseRef.current !== "idle") return;
    if (!speechRecognitionAvailable()) {
      if (__DEV__) {
        console.warn("[useArenaVoiceAssistant] Idle STT skipped: recognition unavailable (Expo Go or device).");
      }
      return;
    }

    try {
      const perm = await listeningTransport.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ARENA_ERR_MIC_DENIED);
        return;
      }
      setError(null);

      await listeningTransport.startListening({
        lang: RU,
        interimResults: true,
        continuous: true,
        contextualStrings: ["Арена", "арена", "тренировка"],
        addsPunctuation: false,
      });
      recognizerActiveRef.current = true;
      orchestrator.notifySttListeningStarted("continuous_idle");
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : ARENA_ERR_WAKE_START);
      }
    }
  }, [listeningTransport, orchestrator, speechRecognitionAvailable]);

  startIdleRecognitionRef.current = startIdleRecognition;

  useSpeechRecognitionEvent("start", () => {
    recognizerActiveRef.current = true;
    listeningHandlersRef.current.onListeningStateChange("started");
  });

  useSpeechRecognitionEvent("end", () => {
    recognizerActiveRef.current = false;
    listeningHandlersRef.current.onListeningStateChange("ended");
    if (phaseRef.current === "listening" && mountedRef.current && commandTextRef.current.trim().length > 0) {
      setTimeout(() => {
        if (phaseRef.current === "listening" && mountedRef.current) {
          void finalizeCommandListeningRef.current("end");
        }
      }, 320);
    }
  });

  useSpeechRecognitionEvent("result", (ev) => {
    const e = ev as { isFinal?: boolean; results?: { transcript?: string }[] };
    const t = e?.results?.[0]?.transcript?.trim() ?? "";
    if (!t) return;
    listeningHandlersRef.current.onTranscriptSegment({
      text: t,
      isFinal: Boolean(e.isFinal),
    });

    if (phaseRef.current === "idle") {
      if (transcriptContainsWakeWord(t)) {
        void onWakeDetectedRef.current();
        return;
      }
      if (e.isFinal && paramsRef.current.enabled && paramsRef.current.sessionId && paramsRef.current.isSessionLive) {
        const normFull = normalizeArenaTranscript(t);
        const nowTs = Date.now();
        if (
          normFull &&
          normFull === lastVoiceExecutedNormRef.current &&
          nowTs - lastVoiceExecutedAtRef.current < ANTI_REPEAT_WINDOW_MS
        ) {
          return;
        }
        if (isGarbageTranscript(t, normFull)) return;
        if (ingestVoiceClarifyFlowActiveRef.current) {
          enqueueArenaLiveUtterance(t, "idle_continuous_final");
          return;
        }
        arenaPipelineEntryRef.current = "idle_continuous_final";
        phaseRef.current = "listening";
        commandTextRef.current = t;
        if (mountedRef.current) {
          setUiPhase("listening");
          setLastTranscript(t);
        }
        void finalizeCommandListeningRef.current("idle_continuous_final", {
          overrideText: t,
          overridePipelineEntry: "idle_continuous_final",
        });
      }
      return;
    }

    if (phaseRef.current === "listening") {
      commandTextRef.current = t;
      if (mountedRef.current) setLastTranscript(t);
      lastVolumeLoudAtRef.current = Date.now();
      bumpSilenceFinalize();
      if (e.isFinal && mountedRef.current) {
        void finalizeCommandListeningRef.current("final", {
          overrideText: t,
          overridePipelineEntry: "wake_listen",
        });
      }
    }
  });

  useSpeechRecognitionEvent("volumechange", (ev) => {
    const v = (ev as { value?: number })?.value ?? -10;
    if (phaseRef.current !== "listening") return;
    if (v > 0) {
      lastVolumeLoudAtRef.current = Date.now();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }
    if (commandTextRef.current.trim().length >= 2) {
      bumpSilenceFinalize();
    }
  });

  useSpeechRecognitionEvent("error", (ev) => {
    const e = ev as { error?: string; message?: string };
    if (e?.error === "aborted") return;
    recognizerActiveRef.current = false;
    if (!mountedRef.current) return;
    const msg = e?.message ?? e?.error ?? ARENA_ERR_RECOGNITION_GENERIC;
    listeningHandlersRef.current.onError(msg, ev);
    if (phaseRef.current === "listening") {
      Alert.alert(ARENA_ALERT_TITLE, msg);
      setPhase("idle");
      scheduleIdleRestart();
      return;
    }
    if (phaseRef.current === "idle") {
      setError(msg);
      idleRestartTimerRef.current = setTimeout(() => {
        idleRestartTimerRef.current = null;
        if (mountedRef.current && phaseRef.current === "idle") {
          void startIdleRecognitionRef.current();
        }
      }, 1200);
    }
  });

  useSpeechRecognitionEvent("nomatch", () => {
    recognizerActiveRef.current = false;
    if (phaseRef.current === "listening" && mountedRef.current) {
      void finalizeCommandListeningRef.current("nomatch");
    }
  });

  useEffect(() => {
    if (!enabled || !sessionId || !isSessionLive) {
      clearTimers();
      hardStopRecognizer();
      setPhase("idle");
      clearPendingClarification();
      setLastArenaIntentV1(null);
      orchestrator.notifySessionDisarmed();
      return;
    }
    orchestrator.notifySessionLiveArmed();
    phaseRef.current = "idle";
    setUiPhase("idle");
    void (async () => {
      orchestrator.notifyWarmingStarted();
      await new Promise((r) => setTimeout(r, 200));
      orchestrator.notifyWarmingFinished();
      if (!mountedRef.current || !paramsRef.current.enabled) return;
      await startIdleRecognitionRef.current();
      scheduleSilenceIdlePromptRef.current();
    })();
    return () => {
      clearTimers();
      hardStopRecognizer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- старт по смене сессии; startIdleRecognition стабилен через ref
  }, [enabled, sessionId, isSessionLive, clearTimers, hardStopRecognizer, setPhase, clearPendingClarification, orchestrator]);

  useEffect(() => {
    const sub = (s: AppStateStatus) => {
      if (s !== "active") {
        hardStopRecognizer();
        stopArenaSpeech();
        return;
      }
      const pr = paramsRef.current;
      if (pr.enabled && pr.sessionId && pr.isSessionLive && phaseRef.current === "idle") {
        void startIdleRecognitionRef.current();
      }
    };
    const id = AppState.addEventListener("change", sub);
    return () => id.remove();
  }, [hardStopRecognizer]);

  const clearError = useCallback(() => setError(null), []);

  const persistenceBridge = useMemo(
    () => ({
      notifyOutboxFlushStarted: () => {
        orchestrator.notifyFlushingStarted();
        contextStoreRef.current.setOutboxFlushInFlight(true);
      },
      notifyOutboxFlushFinished: () => {
        orchestrator.notifyFlushingFinished();
        contextStoreRef.current.setOutboxFlushInFlight(false);
        tryScheduleDrainUtteranceQueueRef.current();
      },
    }),
    [orchestrator]
  );

  return {
    uiPhase,
    clarifyPhase,
    orchestratorPhase,
    arenaUtteranceQueueDepth,
    lastTranscript,
    lastIntent,
    lastArenaIntentV1,
    error,
    isSpeechAvailable,
    clearError,
    persistenceBridge,
  };
}

export type { ArenaIntent } from "@/lib/arena/parse-arena-intent";

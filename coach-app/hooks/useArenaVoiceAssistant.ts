/**
 * Coach live Arena — голосовой ассистент в эфире (`live-training/*`).
 * ⚠ AI-ASSISTED, NOT AUTONOMOUS AGENT: wake word → одна команда → rule-based intent → действия сессии.
 * ❗ Не parent external `/api/arena/*` и не marketplace.
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
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
  ARENA_TTS_LAST_EMPTY,
  ARENA_TTS_PLAYER_NOT_FOUND,
  ARENA_TTS_REASSIGNED,
  ARENA_TTS_REASSIGN_NO_DRAFT,
  ARENA_TTS_REFRESHED,
  ARENA_TTS_SESSION_ALREADY_LIVE,
  ARENA_TTS_TIMER_PAUSED,
  ARENA_TTS_TIMER_RESUMED,
  ARENA_TTS_UNKNOWN,
} from "@/lib/arenaVoicePhrases";
import type { Href } from "expo-router";
import {
  buildInsightTts,
  evaluateLiveCoachInsights,
  type LiveCoachInsightContext,
} from "@/lib/arenaCoachIntelligence";
import type { LiveTrainingEventItem } from "@/services/liveTrainingService";
import type { LiveTrainingSentiment, LiveTrainingSession } from "@/types/liveTraining";

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

export type LastArenaPostMeta = {
  draftId: string;
  sourceText: string;
  category: string;
  sentiment: LiveTrainingSentiment;
  needsReview: boolean;
  playerId: string | null;
} | null;

export type UseArenaVoiceAssistantParams = {
  enabled: boolean;
  sessionId: string | undefined;
  isSessionLive: boolean;
  roster: RosterEntry[];
  lastArenaPostRef: MutableRefObject<LastArenaPostMeta>;
  router: { push: (href: Href) => void; replace: (href: Href) => void };
  /** POST события; вернуть meta черновика или null (например, ушло в outbox без id) */
  postArenaObservation: (args: {
    rawText: string;
    playerId?: string;
    category?: string;
    sentiment: LiveTrainingSentiment;
    confidence?: number | null;
  }) => Promise<LastArenaPostMeta | null>;
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
};

export type ArenaClarifyPhase = "none" | "player" | "target" | "meaning";

export type UseArenaVoiceAssistantResult = {
  uiPhase: ArenaAssistantUiPhase;
  clarifyPhase: ArenaClarifyPhase;
  lastTranscript: string;
  lastIntent: ArenaParsedIntent | null;
  /** Rule-based intent V1 (parse-arena-intent); не заменяет lastIntent / parseArenaCommand. */
  lastArenaIntentV1: ArenaIntent | null;
  error: string | null;
  isSpeechAvailable: boolean;
  clearError: () => void;
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

function speechAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
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
  } = params;

  const [uiPhase, setUiPhase] = useState<ArenaAssistantUiPhase>("idle");
  const [clarifyPhase, setClarifyPhase] = useState<ArenaClarifyPhase>("none");
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastIntent, setLastIntent] = useState<ArenaParsedIntent | null>(null);
  const [lastArenaIntentV1, setLastArenaIntentV1] = useState<ArenaIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeechAvailable, setIsSpeechAvailable] = useState(speechAvailable);

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
  const conversationContextRef = useRef(createEmptyArenaConversationContext());
  const pendingClarificationRef = useRef(createIdleArenaPendingClarification());
  const clarifyActivatedRef = useRef(false);

  const clearPendingClarification = useCallback(() => {
    pendingClarificationRef.current = createIdleArenaPendingClarification();
    setClarifyPhase("none");
  }, []);
  type ParamsRef = UseArenaVoiceAssistantParams & {
    sessionId: string | undefined;
    enabled: boolean;
    isSessionLive: boolean;
    eventsRef?: MutableRefObject<LiveTrainingEventItem[]>;
    sessionRef?: MutableRefObject<LiveTrainingSession | null>;
    scheduleArenaContext?: ArenaScheduleSlotContext | null;
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
  };
  rosterRef.current = roster;

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
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        /* ignore */
      }
    }
    recognizerActiveRef.current = false;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingClarificationRef.current = createIdleArenaPendingClarification();
      clearTimers();
      hardStopRecognizer();
      stopArenaSpeech();
    };
  }, [clearTimers, hardStopRecognizer]);

  useEffect(() => {
    conversationContextRef.current = createEmptyArenaConversationContext();
    clearPendingClarification();
    lastVoiceExecutedNormRef.current = "";
    lastVoiceExecutedAtRef.current = 0;
  }, [sessionId, clearPendingClarification]);

  useEffect(() => {
    setIsSpeechAvailable(speechAvailable());
  }, [enabled]);

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

  const emitCoachInsightIfNeededRef = useRef<() => void>(() => {});

  const emitCoachInsightIfNeeded = useCallback(() => {
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
      if (phaseRef.current === "listening") return;
      void speakArenaShort(tts);
    }, COACH_INSIGHT_DELAY_AFTER_OBS_MS);
  }, []);

  emitCoachInsightIfNeededRef.current = emitCoachInsightIfNeeded;

  const startIdleRecognitionRef = useRef<() => Promise<void>>(async () => {});
  const startClarifyCaptureRef = useRef<() => Promise<void>>(async () => {});

  const finalizeCommandListening = useCallback(
    async (reason: string) => {
      if (finalizeLockRef.current) return;
      if (phaseRef.current !== "listening") return;
      finalizeLockRef.current = true;
      clearTimers();
      hardStopRecognizer();

      const text = commandTextRef.current.trim();
      commandTextRef.current = "";
      if (mountedRef.current) setLastTranscript(text);

      try {
        await playArenaStopSound();
      } catch {
        /* ignore */
      }

      if (!mountedRef.current) {
        finalizeLockRef.current = false;
        return;
      }

      setPhase("processing");

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
              const meta = await p.postArenaObservation({
                rawText: prefixedArenaObservationRaw(intent),
                playerId: intent.kind === "create_player_observation" ? intent.playerId : undefined,
                category: intent.category,
                sentiment: intent.sentiment,
                confidence: intent.confidence,
              });
              if (!mountedRef.current) break;
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
              if (meta) {
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
              } else {
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
              const ttsSalt = meta?.draftId ?? `${intent.rawText}:${Date.now()}`;
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
              emitCoachInsightIfNeededRef.current();
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
        const p = paramsRef.current;
        const sid = p.sessionId;

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
            void speakArenaShort(pend.prompt);
            clarifyActivatedRef.current = true;
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

        const hasWake = transcriptContainsWakeWord(text);
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
            void speakArenaShort(resolved.followUpHint);
            clarifyActivatedRef.current = true;
            return;
          }
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
        if (clarifyActivatedRef.current) {
          setPhase("idle");
          void startClarifyCaptureRef.current();
        } else {
          setPhase("idle");
          scheduleIdleRestart();
          scheduleSilenceIdlePrompt();
        }
      }
    },
    [
      clearTimers,
      hardStopRecognizer,
      scheduleIdleRestart,
      scheduleSilenceIdlePrompt,
      setPhase,
      clearPendingClarification,
    ]
  );

  const finalizeCommandListeningRef = useRef(finalizeCommandListening);
  finalizeCommandListeningRef.current = finalizeCommandListening;

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
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ARENA_ERR_MIC_DENIED);
        clearPendingClarification();
        setPhase("idle");
        scheduleIdleRestart();
        return;
      }
      setError(null);

      await ExpoSpeechRecognitionModule.start({
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
  }, [clearTimers, hardStopRecognizer, scheduleIdleRestart, setPhase, clearPendingClarification]);

  startClarifyCaptureRef.current = startClarifyCapture;

  const bumpSilenceFinalize = useCallback(() => {
    if (phaseRef.current !== "listening") return;
    if (commandTextRef.current.trim().length < 2) return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      if (phaseRef.current === "listening" && mountedRef.current) {
        void finalizeCommandListeningRef.current("silence");
      }
    }, SILENCE_TAIL_MS);
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
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ARENA_ERR_MIC_DENIED);
        setPhase("idle");
        scheduleIdleRestart();
        return;
      }

      await ExpoSpeechRecognitionModule.start({
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
  }, [clearTimers, hardStopRecognizer, scheduleIdleRestart, setPhase]);

  const onWakeDetectedRef = useRef(onWakeDetected);
  onWakeDetectedRef.current = onWakeDetected;

  const startIdleRecognition = useCallback(async () => {
    const pr = paramsRef.current;
    if (!mountedRef.current || !pr.enabled || !pr.sessionId || !pr.isSessionLive) return;
    if (phaseRef.current !== "idle") return;
    if (!speechAvailable()) {
      if (__DEV__) {
        console.warn("[useArenaVoiceAssistant] Idle STT skipped: recognition unavailable (Expo Go or device).");
      }
      return;
    }

    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ARENA_ERR_MIC_DENIED);
        return;
      }
      setError(null);

      await ExpoSpeechRecognitionModule.start({
        lang: RU,
        interimResults: true,
        continuous: true,
        contextualStrings: ["Арена", "арена", "тренировка"],
        addsPunctuation: false,
      });
      recognizerActiveRef.current = true;
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : ARENA_ERR_WAKE_START);
      }
    }
  }, []);

  startIdleRecognitionRef.current = startIdleRecognition;

  useSpeechRecognitionEvent("start", () => {
    recognizerActiveRef.current = true;
  });

  useSpeechRecognitionEvent("end", () => {
    recognizerActiveRef.current = false;
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

    if (phaseRef.current === "idle") {
      if (transcriptContainsWakeWord(t)) {
        void onWakeDetectedRef.current();
      }
      return;
    }

    if (phaseRef.current === "listening") {
      commandTextRef.current = t;
      if (mountedRef.current) setLastTranscript(t);
      lastVolumeLoudAtRef.current = Date.now();
      bumpSilenceFinalize();
      if (e.isFinal && mountedRef.current) {
        void finalizeCommandListeningRef.current("final");
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
      return;
    }
    phaseRef.current = "idle";
    setUiPhase("idle");
    void (async () => {
      await new Promise((r) => setTimeout(r, 200));
      if (!mountedRef.current || !paramsRef.current.enabled) return;
      await startIdleRecognitionRef.current();
      scheduleSilenceIdlePromptRef.current();
    })();
    return () => {
      clearTimers();
      hardStopRecognizer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- старт по смене сессии; startIdleRecognition стабилен через ref
  }, [enabled, sessionId, isSessionLive, clearTimers, hardStopRecognizer, setPhase, clearPendingClarification]);

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

  return {
    uiPhase,
    clarifyPhase,
    lastTranscript,
    lastIntent,
    lastArenaIntentV1,
    error,
    isSpeechAvailable,
    clearError,
  };
}

export type { ArenaIntent } from "@/lib/arena/parse-arena-intent";

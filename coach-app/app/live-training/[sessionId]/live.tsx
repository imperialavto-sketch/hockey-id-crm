/** PHASE 3: `COACH_CANONICAL_LIVE_FLOW` — `liveTrainingService` (`docs/PHASE_3_APP_FLOW_LOCK.md`). */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Reanimated from "react-native-reanimated";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { screenReveal } from "@/lib/animations";
import { coachHapticSelection, coachHapticSuccess } from "@/lib/coachHaptics";
import {
  useArenaVoiceAssistant,
  type LastArenaPostMeta,
} from "@/hooks/useArenaVoiceAssistant";
import type { LiveTrainingSentiment } from "@/types/liveTraining";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { theme } from "@/constants/theme";
import {
  buildLiveMicroGuidanceFromPlanningSnapshot,
  type LiveMicroGuidanceTone,
} from "@/lib/liveTrainingMicroGuidance";
import { buildLiveTrainingSeedContextView } from "@/lib/liveTrainingSeedContextView";
import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";
import {
  buildLiveScheduleHeroContextLine,
  buildLiveScheduleSlotTimeLine,
  buildLiveSessionOpeningTts,
  buildLiveSessionStatusSubline,
  type ArenaScheduleSlotContext,
} from "@/lib/arenaAssistantBehavior";
import {
  resolveLiveTrainingScheduleRouteContext,
  scheduleRouteContextToArena,
  scheduleRouteQuerySuffix,
  withLtArenaAutoQuery,
} from "@/lib/liveTrainingScheduleRouteContext";
import { speakArenaShort } from "@/lib/arenaVoiceFeedback";
import {
  ARENA_ALERT_ACTION_CREATED_BODY,
  ARENA_ALERT_ACTION_CREATED_TITLE,
  ARENA_TTS_FINISH_TO_REVIEW,
  ARENA_UI_CLARIFY_MEANING,
  ARENA_UI_CLARIFY_PLAYER,
  ARENA_UI_CLARIFY_TARGET,
  ARENA_UI_ERROR_HINT,
  ARENA_UI_MIC_OFF_BUILD,
  ARENA_UI_MIC_OFF_WEB,
  ARENA_UI_STATUS_IDLE,
  ARENA_UI_STATUS_LISTENING,
  ARENA_UI_STATUS_PROCESSING,
} from "@/lib/arenaVoicePhrases";
import {
  appendCapturedSessionAction,
  buildInSessionActionMemoryView,
  clipMemoryTitle,
  type LiveTrainingInSessionCapturedAction,
} from "@/lib/liveTrainingInSessionActionMemory";
import {
  buildInSessionNudgeCandidates,
  createInSessionNudgeGateState,
  liveTrainingEventToNudgeInput,
  liveTrainingOutboxBodyToNudgeInput,
  tryAcceptInSessionNudgeMutable,
  type InSessionNudgeActionOffer,
} from "@/lib/liveTrainingInSessionNudges";
import { createActionItem } from "@/services/voiceCreateService";
import { ApiRequestError } from "@/lib/api";
import { getCoachTeamDetail } from "@/services/coachTeamsService";
import { getCoachPlayers } from "@/services/coachPlayersService";
import { createClientMutationId } from "@/lib/liveTrainingClientMutationId";
import {
  enqueueLiveTrainingEvent,
  ensureOutboxItemClientMutationId,
  loadLiveTrainingEventOutbox,
  removeLiveTrainingQueuedEvent,
  updateLiveTrainingQueuedEvent,
  type LiveTrainingEventOutboxBody,
} from "@/lib/liveTrainingEventOutbox";
import {
  accumulateDevelopmentFromEvents,
  accumulateDevelopmentFromOutboxBodies,
  buildArenaDevelopmentPlayerBlocks,
  formatDevelopmentZoneLine,
  mergeLiveDevelopmentAccumulators,
} from "@/lib/arenaDevelopmentMapping";
import { trackLiveTrainingEvent } from "@/lib/liveTrainingTelemetry";
import {
  deleteLiveTrainingDraft,
  finishLiveTrainingSession,
  getLiveTrainingSession,
  isLiveTrainingTransientApiError,
  listLiveTrainingSessionEvents,
  patchLiveTrainingDraft,
  postLiveTrainingSessionEvent,
  withLiveTrainingTransientRetry,
  type LiveTrainingEventItem,
} from "@/services/liveTrainingService";
import type {
  LiveTrainingConfirmedExternalDevelopmentCarry,
  LiveTrainingExternalCoachFeedbackCarry,
  LiveTrainingGuidanceCue,
  LiveTrainingPlanningSnapshot,
  LiveTrainingPlanningSnapshotStartPriorities,
  LiveTrainingPreviousSessionNextActionsCarryV1,
  LiveTrainingSession,
  LiveTrainingSessionMeaning,
} from "@/types/liveTraining";

/** Одна строка из уже распарсенного `session.sessionMeaningJson` (без отдельной карточки). */
function formatLiveSessionMeaningOneLine(meaning: LiveTrainingSessionMeaning): string | null {
  const topTheme = [...meaning.themes].sort((a, b) => b.weight - a.weight)[0];
  if (topTheme) {
    const t = formatLiveTrainingMetricDomain(topTheme.key).trim();
    if (t) return `Сейчас в фокусе: ${t}`;
  }
  const topFocus = [...meaning.focus].sort((a, b) => b.weight - a.weight)[0];
  if (topFocus) {
    const f = formatLiveTrainingMetricDomain(topFocus.label).trim();
    if (f) return `Сейчас в фокусе: ${f}`;
  }
  return null;
}

const SENTIMENT_OPTIONS: { key: LiveTrainingSentiment; label: string }[] = [
  { key: "neutral", label: "Нейтр." },
  { key: "positive", label: "Плюс" },
  { key: "negative", label: "Минус" },
];

function formatElapsedMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function confirmedExternalCarryHasDisplayable(
  c: LiveTrainingConfirmedExternalDevelopmentCarry | undefined
): boolean {
  return Boolean(c && c.source === "external_coach" && c.coachName?.trim());
}

function externalCoachFeedbackCarryHasDisplayable(
  c: LiveTrainingExternalCoachFeedbackCarry | undefined
): boolean {
  return Boolean(c?.coachName?.trim() && c.summary?.trim());
}

function planningSnapshotHasDisplayable(s: LiveTrainingPlanningSnapshot): boolean {
  return (
    previousSessionCarryHasDisplayable(s.previousSessionNextActionsCarryV1) ||
    confirmedExternalCarryHasDisplayable(s.confirmedExternalDevelopmentCarry) ||
    externalCoachFeedbackCarryHasDisplayable(s.externalCoachFeedbackCarry) ||
    liveStartPriorityHandoffVisible(s.startPriorities) ||
    (s.summaryLines?.length ?? 0) > 0 ||
    (s.focusPlayers?.length ?? 0) > 0 ||
    (s.focusDomains?.length ?? 0) > 0 ||
    (s.reinforceAreas?.length ?? 0) > 0 ||
    (s.suggestionSeeds?.items?.length ?? 0) > 0 ||
    (s.planSeeds && Array.isArray(s.planSeeds.blocks) && s.planSeeds.blocks.length > 0)
  );
}

/** PHASE 42: компактный handoff на live — не показываем при lowData или пустом слое */
function liveStartPriorityHandoffVisible(
  sp: LiveTrainingPlanningSnapshotStartPriorities | undefined
): boolean {
  if (!sp || sp.lowData) return false;
  return (
    Boolean(sp.summaryLine?.trim()) ||
    sp.primaryPlayers.length > 0 ||
    sp.primaryDomains.length > 0 ||
    sp.reinforcementItems.length > 0
  );
}

function shortPlayerName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || full;
}

function previousSessionCarryHasDisplayable(
  c: LiveTrainingPreviousSessionNextActionsCarryV1 | undefined
): boolean {
  if (!c || c.version !== 1) return false;
  return (
    c.trainingFocus.some((x) => x.trim().length > 0) ||
    c.teamAccents.some((x) => x.trim().length > 0) ||
    c.players.some((p) => p.actions.some((a) => a.trim().length > 0))
  );
}

function LivePreviousSessionCarryBlock({
  carry,
}: {
  carry: LiveTrainingPreviousSessionNextActionsCarryV1;
}) {
  return (
    <SectionCard elevated style={styles.prevCarryCard}>
      <Text style={styles.prevCarryKicker}>Что переносим из прошлой тренировки</Text>
      {carry.trainingFocus.length > 0 ? (
        <>
          <Text style={styles.prevCarrySubkicker}>Главный фокус</Text>
          {carry.trainingFocus.slice(0, 3).map((line, i) => (
            <Text key={`pc-f-${i}`} style={styles.prevCarryLine}>
              • {line}
            </Text>
          ))}
        </>
      ) : null}
      {carry.players.length > 0 ? (
        <>
          <Text
            style={[
              styles.prevCarrySubkicker,
              carry.trainingFocus.length > 0 ? styles.prevCarrySubkickerSpaced : null,
            ]}
          >
            Особое внимание
          </Text>
          {carry.players.slice(0, 3).map((p) => (
            <View key={p.playerId} style={styles.prevCarryPlayerBlock}>
              <Text style={styles.prevCarryPlayerName}>{shortPlayerName(p.playerName)}</Text>
              {p.actions.slice(0, 3).map((a, i) => (
                <Text key={`${p.playerId}-a-${i}`} style={styles.prevCarryLineMuted}>
                  • {a}
                </Text>
              ))}
            </View>
          ))}
        </>
      ) : null}
      {carry.teamAccents.length > 0 ? (
        <>
          <Text
            style={[
              styles.prevCarrySubkicker,
              (carry.trainingFocus.length > 0 || carry.players.length > 0)
                ? styles.prevCarrySubkickerSpaced
                : null,
            ]}
          >
            Командные акценты
          </Text>
          {carry.teamAccents.slice(0, 3).map((line, i) => (
            <Text key={`pc-t-${i}`} style={styles.prevCarryLine}>
              • {line}
            </Text>
          ))}
        </>
      ) : null}
    </SectionCard>
  );
}

function LiveConfirmedExternalCoachCarryBlock({
  carry,
  rosterNameById,
}: {
  carry: LiveTrainingConfirmedExternalDevelopmentCarry;
  rosterNameById: Record<string, string>;
}) {
  const skillsLine = (carry.skills ?? []).filter((s) => s.trim()).join(" · ");
  const pid = carry.playerId?.trim();
  const forWhom = pid
    ? rosterNameById[pid]?.trim()
      ? shortPlayerName(rosterNameById[pid]!)
      : `Игрок`
    : "Команда";
  return (
    <SectionCard elevated style={styles.prevCarryCard}>
      <Text style={styles.prevCarryKicker}>Подтверждённая внешняя работа</Text>
      <Text style={styles.prevCarryPlayerName}>{carry.coachName.trim()}</Text>
      {skillsLine ? (
        <Text style={styles.prevCarryLineMuted} numberOfLines={4}>
          {skillsLine}
        </Text>
      ) : null}
      <Text style={[styles.prevCarryLine, styles.prevCarrySubkickerSpaced]} numberOfLines={2}>
        Для кого: {forWhom}
      </Text>
    </SectionCard>
  );
}

function LiveExternalCoachFeedbackCarryBlock({ carry }: { carry: LiveTrainingExternalCoachFeedbackCarry }) {
  const areas = (carry.focusAreas ?? []).filter((x) => x.trim()).slice(0, 3);
  return (
    <SectionCard elevated style={styles.prevCarryCard}>
      <Text style={styles.prevCarryKicker}>Что дал внешний тренер</Text>
      <Text style={styles.prevCarryLine} numberOfLines={6}>
        {carry.summary.trim()}
      </Text>
      {areas.length > 0 ? (
        <>
          <Text style={[styles.prevCarrySubkicker, styles.prevCarrySubkickerSpaced]}>В фокусе</Text>
          {areas.map((line, i) => (
            <Text key={`fb-f-${i}`} style={styles.prevCarryLineMuted} numberOfLines={2}>
              • {line}
            </Text>
          ))}
        </>
      ) : null}
    </SectionCard>
  );
}

function microGuidanceToneLabelRu(t: LiveMicroGuidanceTone | undefined): string {
  if (t === "check") return "Сверить";
  if (t === "reinforce") return "Закрепить";
  return "Фокус";
}

function buildCaptureSuccessLabel(
  kind: "voice" | "manual",
  playerId: string | null | undefined,
  rosterList: Array<{ id: string; name: string }>
): string {
  const pid = playerId ?? null;
  if (pid) {
    const name = rosterList.find((p) => p.id === pid)?.name;
    if (name?.trim()) return `Сохранено: ${shortPlayerName(name)}`;
  }
  if (kind === "manual") return "Сохранено без привязки к игроку";
  return "Наблюдение сохранено";
}

const liveEventRowStyles = StyleSheet.create({
  eventRow: {
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  eventTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eventTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
  eventTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  eventSourcePill: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  eventReviewPill: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  eventWho: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  eventText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 20,
  },
});

const LiveTrainingEventRow = React.memo(function LiveTrainingEventRow({
  ev,
  index,
}: {
  ev: LiveTrainingEventItem;
  index: number;
}) {
  const time = new Date(ev.createdAt).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const who = ev.playerNameRaw?.trim() || (ev.playerId ? "Игрок" : "Без игрока");
  const sourceLabel =
    ev.sourceType === "transcript_segment"
      ? "голос"
      : ev.sourceType === "manual_stub"
        ? "текст"
        : null;
  return (
    <View style={liveEventRowStyles.eventRow}>
      <View style={liveEventRowStyles.eventTop}>
        <View style={liveEventRowStyles.eventTimeRow}>
          <Text style={liveEventRowStyles.eventTime}>{time}</Text>
          {sourceLabel ? <Text style={liveEventRowStyles.eventSourcePill}>{sourceLabel}</Text> : null}
        </View>
        {ev.needsReview ? <Text style={liveEventRowStyles.eventReviewPill}>проверка</Text> : null}
      </View>
      <Text style={liveEventRowStyles.eventWho}>{who}</Text>
      <Text style={liveEventRowStyles.eventText}>{ev.normalizedText?.trim() || ev.rawText}</Text>
    </View>
  );
});

function guidanceCueBorderColor(tone: LiveTrainingGuidanceCue["tone"]): string {
  if (tone === "attention") return theme.colors.warning;
  if (tone === "positive") return theme.colors.success;
  return theme.colors.border;
}

function guidanceSourceBlockLabelRu(
  t: LiveTrainingGuidanceCue["sourceBlockType"] | undefined
): string | null {
  if (!t) return null;
  if (t === "focus") return "Индивидуальный фокус";
  if (t === "main") return "Основной блок";
  if (t === "reinforcement") return "Закрепление";
  if (t === "warmup") return "Разминка";
  return null;
}

function alertLiveTrainingOutboxFlushError(err: unknown) {
  const msg =
    err instanceof ApiRequestError
      ? err.message
      : "Не удалось отправить очередь. Попробуйте снова.";
  Alert.alert("Ошибка", msg);
}

function LiveTrainingScreen() {
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const sessionId = routeParams.sessionId;
  const router = useRouter();

  const [session, setSession] = useState<LiveTrainingSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [totalPausedMs, setTotalPausedMs] = useState(0);
  const [pauseBeganAt, setPauseBeganAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [quickText, setQuickText] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [sentimentPick, setSentimentPick] = useState<LiveTrainingSentiment>("neutral");
  /** Ручной выбор строки игроков — после тапа показываем «активный» стиль; до тапа допускаем мягкий auto-fill. */
  const [playerRowTouched, setPlayerRowTouched] = useState(false);
  /** Игрок подставлен из последнего intent «Арены» (create_player_observation). */
  const [playerPickFromAssistant, setPlayerPickFromAssistant] = useState(false);
  /** Любой тап по тональности — до этого «Нейтр.» визуально мягкий default. */
  const [sentimentRowTouched, setSentimentRowTouched] = useState(false);
  const [playerPick, setPlayerPick] = useState<string | null>(null);
  const [roster, setRoster] = useState<Array<{ id: string; name: string; position?: string }>>([]);
  const [events, setEvents] = useState<LiveTrainingEventItem[]>([]);
  const eventsRef = useRef<LiveTrainingEventItem[]>([]);
  const sessionRef = useRef<LiveTrainingSession | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [submittingObs, setSubmittingObs] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [captureFeedback, setCaptureFeedback] = useState<{
    text: string;
    kind: "voice" | "manual";
  } | null>(null);
  const captureFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const captureFeedbackHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [outboxCount, setOutboxCount] = useState(0);
  const [outboxBodies, setOutboxBodies] = useState<LiveTrainingEventOutboxBody[]>([]);
  const [flushingOutbox, setFlushingOutbox] = useState(false);
  const flushOutboxLockRef = useRef(false);
  const lastArenaPostRef = useRef<LastArenaPostMeta>(null);
  const inSessionNudgeGateRef = useRef(createInSessionNudgeGateState());
  const inSessionNudgeTtsKeysRef = useRef<Set<string>>(new Set());
  const consumedNudgeActionKeysRef = useRef<Set<string>>(new Set());
  const [nudgeConsumeEpoch, setNudgeConsumeEpoch] = useState(0);
  const [nudgeCtaBusy, setNudgeCtaBusy] = useState(false);
  const [sessionNudgeBanner, setSessionNudgeBanner] = useState<{
    line: string;
    speakRu?: string;
    dedupeKey: string;
    ttsEligible: boolean;
    action?: InSessionNudgeActionOffer;
  } | null>(null);
  const [sessionCapturedActions, setSessionCapturedActions] = useState<
    LiveTrainingInSessionCapturedAction[]
  >([]);

  const sid = typeof sessionId === "string" ? sessionId : sessionId?.[0];

  const scheduleRouteCtx = useMemo(
    () =>
      resolveLiveTrainingScheduleRouteContext(
        session,
        routeParams as Record<string, string | string[] | undefined>
      ),
    [
      session,
      routeParams.ltSlot,
      routeParams.ltGid,
      routeParams.ltGnm,
      routeParams.ltS0,
      routeParams.ltS1,
      routeParams.ltSk,
    ]
  );
  const scheduleQuerySuffixStr = useMemo(
    () => scheduleRouteQuerySuffix(scheduleRouteCtx),
    [scheduleRouteCtx]
  );
  const arenaScheduleCtx: ArenaScheduleSlotContext | null = useMemo(
    () => scheduleRouteContextToArena(scheduleRouteCtx),
    [scheduleRouteCtx]
  );

  const mountedRef = useRef(true);
  const sidRef = useRef(sid);
  sidRef.current = sid;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const heroListenPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!session) {
      heroListenPulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(heroListenPulse, {
          toValue: 0.42,
          duration: 880,
          useNativeDriver: true,
        }),
        Animated.timing(heroListenPulse, {
          toValue: 1,
          duration: 880,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [session, heroListenPulse]);

  const openingTtsSidRef = useRef<string | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    if (session?.status !== "live" || !session?.id) return;
    if (openingTtsSidRef.current === session.id) return;
    openingTtsSidRef.current = session.id;
    void speakArenaShort(buildLiveSessionOpeningTts(session, arenaScheduleCtx));
  }, [session, arenaScheduleCtx]);

  const refreshOutboxCount = useCallback(async () => {
    if (!sid) return;
    const reqSid = sid;
    const items = await loadLiveTrainingEventOutbox(reqSid);
    if (!mountedRef.current || sidRef.current !== reqSid) return;
    setOutboxCount(items.length);
    setOutboxBodies(items.map((x) => x.body));
  }, [sid]);

  const loadEvents = useCallback(async () => {
    if (!sid) return;
    const reqSid = sid;
    setEventsLoading(true);
    try {
      const list = await listLiveTrainingSessionEvents(reqSid);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      eventsRef.current = list;
      setEvents(list);
    } catch {
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      eventsRef.current = [];
      setEvents([]);
    } finally {
      if (mountedRef.current && sidRef.current === reqSid) {
        setEventsLoading(false);
      }
    }
  }, [sid]);

  const refresh = useCallback(async () => {
    if (!sid) return;
    const reqSid = sid;
    setLoadError(null);
    try {
      const s = await getLiveTrainingSession(reqSid);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      if (!s) {
        setLoadError("Сессия не найдена или нет доступа");
        setSession(null);
        return;
      }
      if (s.status === "review") {
        router.replace(
          `/live-training/${reqSid}/review${scheduleQuerySuffixStr}` as Parameters<
            typeof router.replace
          >[0]
        );
        return;
      }
      if (s.status === "confirmed") {
        router.replace(
          `/live-training/${reqSid}/complete${scheduleQuerySuffixStr}` as Parameters<
            typeof router.replace
          >[0]
        );
        return;
      }
      if (s.status === "cancelled") {
        setSession(null);
        setLoadError("Эта живая тренировка отменена");
        return;
      }
      setSession(s);
    } catch (e) {
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : "Не удалось загрузить сессию. Проверьте сеть и попробуйте снова.";
      setLoadError(msg);
      setSession(null);
    }
  }, [router, sid, scheduleQuerySuffixStr]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const flushOutbox = useCallback(async () => {
    if (!sid || flushOutboxLockRef.current) return;
    const reqSid = sid;
    flushOutboxLockRef.current = true;
    setFlushingOutbox(true);
    trackLiveTrainingEvent("lt_outbox_flush_start", { sessionId: reqSid, uiPhase: "flush_start" });
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const items = await loadLiveTrainingEventOutbox(reqSid);
        if (items.length === 0) break;
        const item = items[0];
        try {
          const ingestId = await ensureOutboxItemClientMutationId(reqSid, item.localId);
          await withLiveTrainingTransientRetry(() =>
            postLiveTrainingSessionEvent(reqSid, { ...item.body, clientMutationId: ingestId })
          );
          await removeLiveTrainingQueuedEvent(reqSid, item.localId);
          trackLiveTrainingEvent("lt_event_post_success", {
            sessionId: reqSid,
            source: "outbox",
            ingestClientMutationId: ingestId,
            uiPhase: "posted",
          });
        } catch (e) {
          await updateLiveTrainingQueuedEvent(reqSid, item.localId, {
            attempts: item.attempts + 1,
            lastError: e instanceof ApiRequestError ? e.message : String(e),
          });
          break;
        }
      }
    } finally {
      flushOutboxLockRef.current = false;
      setFlushingOutbox(false);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      const left = await loadLiveTrainingEventOutbox(reqSid);
      setOutboxCount(left.length);
      setOutboxBodies(left.map((x) => x.body));
      trackLiveTrainingEvent("lt_outbox_flush_done", {
        sessionId: reqSid,
        remaining: left.length,
        uiPhase: "flush_done",
      });
      await loadEvents();
      await refresh();
    }
  }, [sid, loadEvents, refresh]);

  const loadRoster = useCallback(
    async (teamId: string, reqSid: string, groupFilterId: string | null) => {
      if (groupFilterId) {
        try {
          const players = await getCoachPlayers(teamId, groupFilterId);
          if (!mountedRef.current || sidRef.current !== reqSid) return;
          setRoster(
            players.map((p) => ({
              id: p.id,
              name: p.name,
              position: p.position,
            }))
          );
        } catch {
          if (!mountedRef.current || sidRef.current !== reqSid) return;
          setRoster([]);
        }
        return;
      }
      const d = await getCoachTeamDetail(teamId);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      if (d?.roster?.length) {
        setRoster(
          d.roster.map((p) => ({ id: p.id, name: p.name, position: p.position }))
        );
      } else {
        setRoster([]);
      }
    },
    []
  );

  useEffect(() => {
    setPaused(false);
    setTotalPausedMs(0);
    setPauseBeganAt(null);
    setContextExpanded(false);
    setGuidanceExpanded(false);
    setDetailsExpanded(false);
    inSessionNudgeGateRef.current = createInSessionNudgeGateState();
    inSessionNudgeTtsKeysRef.current = new Set();
    consumedNudgeActionKeysRef.current = new Set();
    setNudgeConsumeEpoch((n) => n + 1);
    setSessionNudgeBanner(null);
    setNudgeCtaBusy(false);
    setSessionCapturedActions([]);
    setPlayerPick(null);
    setPlayerRowTouched(false);
    setPlayerPickFromAssistant(false);
    setSentimentPick("neutral");
    setSentimentRowTouched(false);
    setQuickText("");
    setCategoryDraft("");
    setCaptureFeedback(null);
  }, [sid]);

  useEffect(() => {
    if (!captureFeedback) {
      captureFeedbackOpacity.setValue(0);
      return;
    }
    captureFeedbackOpacity.setValue(0);
    Animated.timing(captureFeedbackOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    if (captureFeedbackHideTimerRef.current) {
      clearTimeout(captureFeedbackHideTimerRef.current);
    }
    captureFeedbackHideTimerRef.current = setTimeout(() => {
      Animated.timing(captureFeedbackOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && mountedRef.current) {
          setCaptureFeedback(null);
        }
      });
    }, 1520);
    return () => {
      if (captureFeedbackHideTimerRef.current) {
        clearTimeout(captureFeedbackHideTimerRef.current);
        captureFeedbackHideTimerRef.current = null;
      }
    };
  }, [captureFeedback, captureFeedbackOpacity]);

  useEffect(() => {
    if (session?.teamId && session.status === "live" && sid) {
      const reqSid = sid;
      const gf = scheduleRouteCtx?.groupId ?? null;
      void loadRoster(session.teamId, reqSid, gf);
      void loadEvents();
      void refreshOutboxCount();
    }
  }, [
    session?.teamId,
    session?.status,
    sid,
    scheduleRouteCtx?.groupId,
    loadRoster,
    loadEvents,
    refreshOutboxCount,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (sid && session?.status === "live") {
        void loadEvents();
        void refreshOutboxCount();
      }
    }, [sid, session?.status, loadEvents, refreshOutboxCount])
  );

  useEffect(() => {
    if (!session || session.status !== "live") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [session]);

  const togglePause = useCallback(() => {
    coachHapticSelection();
    setPaused((p) => {
      if (!p) {
        setPauseBeganAt(Date.now());
        return true;
      }
      setPauseBeganAt((beg) => {
        if (beg != null) {
          setTotalPausedMs((acc) => acc + (Date.now() - beg));
        }
        return null;
      });
      return false;
    });
  }, []);

  const pauseTimerVoice = useCallback(async () => {
    setPaused((p) => {
      if (p) return true;
      setPauseBeganAt(Date.now());
      return true;
    });
  }, []);

  const resumeTimerVoice = useCallback(async () => {
    setPaused((p) => {
      if (!p) return false;
      setPauseBeganAt((beg) => {
        if (beg != null) {
          setTotalPausedMs((acc) => acc + (Date.now() - beg));
        }
        return null;
      });
      return false;
    });
  }, []);

  const elapsedLabel = useMemo(() => {
    if (!session) return "00:00";
    const start = new Date(session.startedAt).getTime();
    const now = Date.now();
    const currentPause =
      paused && pauseBeganAt != null ? now - pauseBeganAt : 0;
    const ms = Math.max(0, now - start - totalPausedMs - currentPause);
    void tick;
    return formatElapsedMs(ms);
  }, [session, paused, pauseBeganAt, totalPausedMs, tick]);

  const planningSnap = session?.planningSnapshot;
  const showPlanningContext =
    !!planningSnap && planningSnapshotHasDisplayable(planningSnap);
  const showStartPriorityHandoff =
    !!planningSnap && liveStartPriorityHandoffVisible(planningSnap.startPriorities);
  const startPrio = planningSnap?.startPriorities;

  const seedContextView = useMemo(
    () => (planningSnap ? buildLiveTrainingSeedContextView(planningSnap.planSeeds) : null),
    [planningSnap]
  );

  const microGuidance = useMemo(
    () => buildLiveMicroGuidanceFromPlanningSnapshot(planningSnap, planningSnap?.startPriorities),
    [planningSnap]
  );

  const sessionMeaningOneLine = useMemo(() => {
    if (!session?.sessionMeaningJson) return null;
    return formatLiveSessionMeaningOneLine(session.sessionMeaningJson);
  }, [session?.sessionMeaningJson]);

  const contextCollapsedHint = useMemo(() => {
    if (!planningSnap) return "";
    const sp = planningSnap.startPriorities;
    if (sp && !sp.lowData && sp.summaryLine?.trim()) {
      const sl = sp.summaryLine.trim();
      return sl.length > 140 ? `${sl.slice(0, 137)}…` : sl;
    }
    const line0 = planningSnap.summaryLines[0]?.trim();
    if (line0) return line0.length > 140 ? `${line0.slice(0, 137)}…` : line0;
    const names = planningSnap.focusPlayers
      .slice(0, 2)
      .map((p) => shortPlayerName(p.playerName))
      .join(", ");
    if (names) return `В фокусе: ${names}`;
    const doms = planningSnap.focusDomains
      .slice(0, 2)
      .map((d) => d.labelRu)
      .join(", ");
    if (doms) return `Темы: ${doms}`;
    const reinf0 = planningSnap.reinforceAreas[0]?.labelRu?.trim();
    if (reinf0) return `Дожим: ${reinf0.length > 80 ? `${reinf0.slice(0, 77)}…` : reinf0}`;
    const seed0 = planningSnap.suggestionSeeds?.items?.[0]?.trim();
    if (seed0) return seed0.length > 120 ? `${seed0.slice(0, 117)}…` : seed0;
    const extC = planningSnap.confirmedExternalDevelopmentCarry;
    if (extC?.coachName?.trim() && extC.source === "external_coach") {
      const nm = extC.coachName.trim();
      const sk0 = extC.skills?.find((x) => x.trim())?.trim();
      const line = sk0 ? `${nm} · ${sk0}` : nm;
      return line.length > 120 ? `${line.slice(0, 117)}…` : line;
    }
    const fbC = planningSnap.externalCoachFeedbackCarry;
    if (fbC?.summary?.trim() && fbC.coachName?.trim()) {
      const t = `${fbC.coachName.trim()}: ${fbC.summary.trim()}`;
      return t.length > 120 ? `${t.slice(0, 117)}…` : t;
    }
    const firstSeed = seedContextView?.blocks[0];
    if (firstSeed) {
      const tail =
        firstSeed.shortDescription.length > 72
          ? `${firstSeed.shortDescription.slice(0, 69)}…`
          : firstSeed.shortDescription;
      return `${firstSeed.title} — ${tail}`;
    }
    return planningSnap.planSeeds?.blocks
      ?.slice(0, 2)
      .map((b) => b.title)
      .join(" · ");
  }, [planningSnap, seedContextView]);

  const guidancePayload = session?.guidanceCues;
  const showGuidance = !!guidancePayload && guidancePayload.cues.length > 0;

  const guidanceCollapsedPreview = useMemo(() => {
    if (!guidancePayload?.cues.length) return "";
    if (guidancePayload.cues.length === 1) {
      const t = guidancePayload.cues[0].title;
      return t.length > 100 ? `${t.slice(0, 97)}…` : t;
    }
    return `${guidancePayload.cues.length} ориентиров по плану`;
  }, [guidancePayload]);

  const postObservation = async (params: {
    rawText: string;
    sourceType: "manual_stub" | "transcript_segment";
  }) => {
    if (!sid) return;
    const reqSid = sid;
    const clientMutationId = createClientMutationId();
    const body: LiveTrainingEventOutboxBody = {
      clientMutationId,
      rawText: params.rawText,
      playerId: playerPick ?? undefined,
      category: categoryDraft.trim() || undefined,
      sentiment: sentimentPick,
      sourceType: params.sourceType,
    };
    try {
      await withLiveTrainingTransientRetry(() => postLiveTrainingSessionEvent(reqSid, body));
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      await loadEvents();
      await refresh();
      coachHapticSuccess();
      trackLiveTrainingEvent("lt_event_post_success", {
        sessionId: reqSid,
        source: "live",
        ingestClientMutationId: clientMutationId,
        uiPhase: "posted",
      });
      setCaptureFeedback({
        text: buildCaptureSuccessLabel("manual", playerPick, roster),
        kind: "manual",
      });
    } catch (err) {
      if (isLiveTrainingTransientApiError(err)) {
        await enqueueLiveTrainingEvent(reqSid, body);
        if (!mountedRef.current || sidRef.current !== reqSid) return;
        await refreshOutboxCount();
        trackLiveTrainingEvent("lt_event_post_queued", {
          sessionId: reqSid,
          ingestClientMutationId: clientMutationId,
          uiPhase: "queued",
        });
        Alert.alert(
          "Сохранено в очередь",
          "Сеть нестабильна — наблюдение сохранено на устройстве. Нажмите «Отправить очередь» ниже или оно уйдёт при следующей попытке."
        );
        return;
      }
      throw err;
    }
  };

  const onQuickObservation = async () => {
    if (!sid) return;
    const t = quickText.trim();
    if (!t) {
      Alert.alert("Текст", "Введите текст наблюдения.");
      return;
    }
    setSubmittingObs(true);
    try {
      await postObservation({ rawText: t, sourceType: "manual_stub" });
      setQuickText("");
      setCategoryDraft("");
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.message : "Не удалось сохранить наблюдение.";
      Alert.alert("Ошибка", msg);
    } finally {
      if (mountedRef.current) setSubmittingObs(false);
    }
  };

  const runFinishToReview = useCallback(async () => {
    if (!sid) return;
    const reqSid = sid;
    setFinishing(true);
    try {
      const { autoFinalized } = await finishLiveTrainingSession(reqSid);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      coachHapticSuccess();
      const finishPath = autoFinalized
        ? `/live-training/${reqSid}/report-draft${withLtArenaAutoQuery(scheduleQuerySuffixStr)}`
        : `/live-training/${reqSid}/review${scheduleQuerySuffixStr}`;
      router.replace(finishPath as Parameters<typeof router.replace>[0]);
    } catch (err) {
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      const msg =
        err instanceof ApiRequestError ? err.message : "Не удалось завершить тренировку.";
      Alert.alert("Ошибка", msg);
    } finally {
      if (mountedRef.current) setFinishing(false);
    }
  }, [router, sid, scheduleQuerySuffixStr]);

  const onFinish = async () => {
    if (!sid) return;
    if (flushingOutbox) {
      Alert.alert("Подождите", "Идёт отправка очереди наблюдений на сервер.");
      return;
    }
    const pending = await loadLiveTrainingEventOutbox(sid);
    if (pending.length > 0) {
      trackLiveTrainingEvent("lt_finish_guard_blocked", {
        sessionId: sid,
        pending: pending.length,
        uiPhase: "blocked",
      });
      Alert.alert(
        "Неотправленные наблюдения",
        `В очереди на устройстве: ${pending.length}. Отправьте их на сервер, чтобы завершить тренировку.`,
        [
          { text: "Отмена", style: "cancel" },
          {
            text: flushingOutbox ? "…" : "Отправить сейчас",
            onPress: () => {
              void (async () => {
                try {
                  await flushOutbox();
                  const left = await loadLiveTrainingEventOutbox(sid);
                  if (left.length === 0) {
                    Alert.alert("Завершить тренировку", "Перейти к проверке наблюдений?", [
                      { text: "Отмена", style: "cancel" },
                      { text: "Завершить", onPress: () => void runFinishToReview() },
                    ]);
                  } else {
                    Alert.alert(
                      "Ошибка",
                      "Не удалось отправить все данные. Проверьте интернет."
                    );
                  }
                } catch {
                  Alert.alert(
                    "Ошибка",
                    "Не удалось отправить все данные. Проверьте интернет."
                  );
                }
              })();
            },
          },
        ]
      );
      return;
    }
    Alert.alert("Завершить тренировку", "Перейти к проверке наблюдений?", [
      { text: "Отмена", style: "cancel" },
      { text: "Завершить", onPress: () => void runFinishToReview() },
    ]);
  };

  const postArenaObservationForVoice = useCallback(
    async (args: {
      rawText: string;
      playerId?: string;
      category?: string;
      sentiment: LiveTrainingSentiment;
      confidence?: number | null;
    }): Promise<LastArenaPostMeta | null> => {
      if (!sid) return null;
      const reqSid = sid;
      const clientMutationId = createClientMutationId();
      const body: LiveTrainingEventOutboxBody = {
        clientMutationId,
        rawText: args.rawText,
        playerId: args.playerId,
        category: args.category?.trim() || undefined,
        sentiment: args.sentiment,
        confidence:
          typeof args.confidence === "number" && Number.isFinite(args.confidence)
            ? Math.max(0, Math.min(1, args.confidence))
            : undefined,
        sourceType: "transcript_segment",
      };
      try {
        const res = await withLiveTrainingTransientRetry(() =>
          postLiveTrainingSessionEvent(reqSid, body)
        );
        if (!mountedRef.current || sidRef.current !== reqSid) return null;
        await loadEvents();
        await refresh();
        coachHapticSuccess();
        trackLiveTrainingEvent("lt_event_post_success", {
          sessionId: reqSid,
          source: "arena_voice",
          ingestClientMutationId: clientMutationId,
          uiPhase: "posted",
        });
        const d = res.draft;
        const sentRaw = String(d.sentiment ?? "");
        const sentiment: LiveTrainingSentiment =
          sentRaw === "positive" || sentRaw === "negative" || sentRaw === "neutral"
            ? sentRaw
            : args.sentiment;
        const resolvedPlayerId = d.playerId ?? args.playerId ?? null;
        setCaptureFeedback({
          text: buildCaptureSuccessLabel("voice", resolvedPlayerId, roster),
          kind: "voice",
        });
        return {
          draftId: d.id,
          sourceText: d.sourceText || args.rawText,
          category: d.category ?? "",
          sentiment,
          needsReview: Boolean(d.needsReview),
          playerId: resolvedPlayerId,
        };
      } catch (err) {
        if (isLiveTrainingTransientApiError(err)) {
          await enqueueLiveTrainingEvent(reqSid, body);
          if (!mountedRef.current || sidRef.current !== reqSid) return null;
          await refreshOutboxCount();
          trackLiveTrainingEvent("lt_event_post_queued", {
            sessionId: reqSid,
            ingestClientMutationId: clientMutationId,
            uiPhase: "queued",
            source: "arena_voice",
          });
          Alert.alert(
            "Сохранено в очередь",
            "Сеть нестабильна — наблюдение сохранено на устройстве. Оно уйдёт при следующей отправке очереди."
          );
          return null;
        }
        throw err;
      }
    },
    [sid, loadEvents, refreshOutboxCount, roster, refresh]
  );

  const finishTrainingVoice = useCallback(async () => {
    if (!sid) return { ok: false as const, message: "Нет сессии." };
    const reqSid = sid;
    if (flushOutboxLockRef.current) {
      return {
        ok: false as const,
        message: "Идёт отправка очереди. Подождите секунду.",
      };
    }
    setFinishing(true);
    try {
      await flushOutbox();
      const left = await loadLiveTrainingEventOutbox(reqSid);
      if (left.length > 0) {
        return {
          ok: false as const,
          message: `В очереди на устройстве: ${left.length}. Отправьте очередь кнопкой ниже или повторите команду.`,
        };
      }
      const { autoFinalized } = await finishLiveTrainingSession(reqSid);
      if (!mountedRef.current || sidRef.current !== reqSid) return { ok: true as const };
      if (!autoFinalized) {
        await speakArenaShort(ARENA_TTS_FINISH_TO_REVIEW);
        if (!mountedRef.current || sidRef.current !== reqSid) return { ok: true as const };
      }
      coachHapticSuccess();
      const finishPath = autoFinalized
        ? `/live-training/${reqSid}/report-draft${withLtArenaAutoQuery(scheduleQuerySuffixStr)}`
        : `/live-training/${reqSid}/review${scheduleQuerySuffixStr}`;
      router.replace(finishPath as Parameters<typeof router.replace>[0]);
      return { ok: true as const };
    } catch (err) {
      const msg =
        err instanceof ApiRequestError ? err.message : "Не удалось завершить тренировку.";
      return { ok: false as const, message: msg };
    } finally {
      if (mountedRef.current) setFinishing(false);
    }
  }, [sid, flushOutbox, router, scheduleQuerySuffixStr]);

  const deleteArenaDraftById = useCallback(
    async (draftId: string) => {
      if (!sid) return;
      const reqSid = sid;
      await deleteLiveTrainingDraft(reqSid, draftId, {
        clientMutationId: createClientMutationId(),
      });
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      await loadEvents();
      coachHapticSuccess();
    },
    [sid, loadEvents]
  );

  const patchArenaDraftPlayer = useCallback(
    async (
      draftId: string,
      playerId: string,
      fields: {
        sourceText: string;
        category: string;
        sentiment: LiveTrainingSentiment;
        needsReview: boolean;
      }
    ) => {
      if (!sid) return;
      const reqSid = sid;
      await patchLiveTrainingDraft(reqSid, draftId, {
        sourceText: fields.sourceText,
        playerId,
        category: fields.category,
        sentiment: fields.sentiment,
        needsReview: fields.needsReview,
        clientMutationId: createClientMutationId(),
      });
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      await loadEvents();
      coachHapticSuccess();
    },
    [sid, loadEvents]
  );

  const arena = useArenaVoiceAssistant({
    enabled: session?.status === "live",
    sessionId: sid,
    isSessionLive: session?.status === "live",
    roster,
    lastArenaPostRef,
    router,
    postArenaObservation: postArenaObservationForVoice,
    refreshSession: refresh,
    finishTrainingVoice,
    pauseTimerVoice,
    resumeTimerVoice,
    deleteDraftById: deleteArenaDraftById,
    patchDraftPlayer: patchArenaDraftPlayer,
    eventsRef,
    sessionRef,
    scheduleArenaContext: arenaScheduleCtx,
  });

  useEffect(() => {
    const li = arena.lastIntent;
    if (!li) return;
    if (li.kind === "create_player_observation") {
      setPlayerPick(li.playerId);
      setPlayerPickFromAssistant(true);
      setPlayerRowTouched(false);
    } else if (li.kind === "create_team_observation" || li.kind === "create_session_observation") {
      setPlayerPick(null);
      setPlayerPickFromAssistant(false);
      setPlayerRowTouched(false);
    }
  }, [arena.lastIntent]);

  const rosterNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of roster) {
      m[p.id] = p.name;
    }
    return m;
  }, [roster]);

  const liveSessionDevelopmentAcc = useMemo(
    () =>
      mergeLiveDevelopmentAccumulators(
        accumulateDevelopmentFromEvents(events),
        accumulateDevelopmentFromOutboxBodies(outboxBodies)
      ),
    [events, outboxBodies]
  );

  const liveSessionDevelopmentBlocks = useMemo(
    () =>
      buildArenaDevelopmentPlayerBlocks(liveSessionDevelopmentAcc, rosterNameById, 3, 4),
    [liveSessionDevelopmentAcc, rosterNameById]
  );

  const inSessionNudgeInputs = useMemo(() => {
    const fromServer = events.map((ev) => liveTrainingEventToNudgeInput(ev));
    const fromOutbox = outboxBodies.map((b) => liveTrainingOutboxBodyToNudgeInput(b));
    return [...fromServer, ...fromOutbox];
  }, [events, outboxBodies]);

  const inSessionSortedCandidates = useMemo(
    () =>
      buildInSessionNudgeCandidates(
        inSessionNudgeInputs,
        rosterNameById,
        session?.teamName ?? null
      ),
    [inSessionNudgeInputs, rosterNameById, session?.teamName]
  );

  const inSessionNudgeVisibleCandidates = useMemo(() => {
    const skip = consumedNudgeActionKeysRef.current;
    return inSessionSortedCandidates.filter((c) => !skip.has(c.dedupeKey));
  }, [inSessionSortedCandidates, nudgeConsumeEpoch]);

  const inSessionActionMemoryView = useMemo(
    () => buildInSessionActionMemoryView(sessionCapturedActions),
    [sessionCapturedActions]
  );

  const onNudgeActionCta = useCallback(async () => {
    if (!sid) return;
    const banner = sessionNudgeBanner;
    const offer = banner?.action;
    if (!banner || !offer) return;
    setNudgeCtaBusy(true);
    trackLiveTrainingEvent("lt_nudge_action_cta", {
      sessionId: sid,
      dedupeKey: banner.dedupeKey,
      nudgeAction: offer.ctaLabelRu,
    });
    try {
      const res = await createActionItem(offer.payload);
      if (!mountedRef.current || sidRef.current !== sid) return;
      if (res.ok) {
        consumedNudgeActionKeysRef.current.add(banner.dedupeKey);
        const pid = offer.payload.playerId?.trim();
        setSessionCapturedActions((prev) =>
          appendCapturedSessionAction(prev, {
            kind: pid ? "player" : "team",
            title: res.data.title || offer.payload.title,
            playerId: pid || undefined,
            dedupeKey: banner.dedupeKey,
            actionItemId: res.data.id,
          })
        );
        setSessionNudgeBanner(null);
        setNudgeConsumeEpoch((n) => n + 1);
        coachHapticSuccess();
        Alert.alert(ARENA_ALERT_ACTION_CREATED_TITLE, ARENA_ALERT_ACTION_CREATED_BODY);
      } else {
        Alert.alert("Не удалось создать задачу", res.error);
      }
    } finally {
      if (mountedRef.current) setNudgeCtaBusy(false);
    }
  }, [sessionNudgeBanner, sid]);

  useEffect(() => {
    if (session?.status !== "live") return;
    if (inSessionNudgeVisibleCandidates.length === 0) return;
    const now = Date.now();
    const gate = inSessionNudgeGateRef.current;
    for (const c of inSessionNudgeVisibleCandidates) {
      if (tryAcceptInSessionNudgeMutable(now, gate, c)) {
        setSessionNudgeBanner({
          line: c.lineRu,
          speakRu: c.speakRu,
          dedupeKey: c.dedupeKey,
          ttsEligible: c.ttsEligible,
          action: c.action,
        });
        break;
      }
    }
  }, [session?.status, inSessionNudgeVisibleCandidates]);

  useEffect(() => {
    if (!sessionNudgeBanner?.ttsEligible || !sessionNudgeBanner.speakRu?.trim()) return;
    if (arena.uiPhase !== "idle" || arena.clarifyPhase !== "none") return;
    const k = sessionNudgeBanner.dedupeKey;
    if (inSessionNudgeTtsKeysRef.current.has(k)) return;
    inSessionNudgeTtsKeysRef.current.add(k);
    void speakArenaShort(sessionNudgeBanner.speakRu);
  }, [sessionNudgeBanner, arena.uiPhase, arena.clarifyPhase]);

  const showSessionNudgeStrip =
    sessionNudgeBanner != null &&
    arena.uiPhase === "idle" &&
    arena.clarifyPhase === "none";

  const showArenaCompanionMemory = inSessionActionMemoryView.preview.length > 0;
  const showArenaCompanion =
    (showSessionNudgeStrip && sessionNudgeBanner != null) || showArenaCompanionMemory;

  const arenaMicScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (arena.uiPhase !== "listening") {
      arenaMicScale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arenaMicScale, {
          toValue: 1.12,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(arenaMicScale, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [arena.uiPhase, arenaMicScale]);

  if (!sid) {
    return (
      <FlagshipScreen scroll={false}>
        <Text style={styles.error}>Некорректная ссылка</Text>
      </FlagshipScreen>
    );
  }

  if (loadError) {
    return (
      <FlagshipScreen contentContainerStyle={styles.errorWrap}>
        <Text style={styles.error}>{loadError}</Text>
        <PrimaryButton
          title="Повторить"
          onPress={() => void refresh()}
          animatedPress
          style={styles.errorBtn}
        />
        <PrimaryButton
          title="На главную"
          variant="outline"
          onPress={() =>
            router.replace("/(tabs)/arena" as Parameters<typeof router.replace>[0])
          }
          animatedPress
        />
      </FlagshipScreen>
    );
  }

  if (!session) {
    return (
      <FlagshipScreen scroll={false}>
        <Text style={styles.muted}>Загрузка…</Text>
      </FlagshipScreen>
    );
  }

  const listeningGlow = arena.uiPhase === "listening";

  return (
    <FlagshipScreen contentContainerStyle={styles.content}>
      <Reanimated.View entering={screenReveal(0)}>
      <GlassCardV2
        padding="lg"
        glow={listeningGlow}
        contentStyle={styles.heroGlassContent}
      >
        {scheduleRouteCtx ? (
          <>
            <Text style={styles.teamTitle}>
              {buildLiveScheduleHeroContextLine({
                teamName: session.teamName,
                liveModeLabel: formatLiveTrainingMode(session.mode),
                scheduleCtx: arenaScheduleCtx,
              })}
            </Text>
            {buildLiveScheduleSlotTimeLine(arenaScheduleCtx) ? (
              <Text style={styles.slotTimeLine}>
                {buildLiveScheduleSlotTimeLine(arenaScheduleCtx)}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.teamTitle}>{session.teamName}</Text>
            <Text style={styles.modeLine}>{formatLiveTrainingMode(session.mode)}</Text>
          </>
        )}
        <Text style={styles.timer}>{elapsedLabel}</Text>
        <View style={styles.heroOperationalBlock}>
          <View style={styles.reliabilityStrip}>
            <View style={styles.reliabilityStripLive}>
              <Animated.View style={[styles.liveDot, { opacity: heroListenPulse }]} />
              <Text style={styles.reliabilityStripLabel}>Live</Text>
            </View>
            {paused ? <Text style={styles.reliabilityStripPause}>Пауза</Text> : null}
            {flushingOutbox ? (
              <Text style={styles.reliabilityStripSending}>Отправка очереди…</Text>
            ) : outboxCount > 0 ? (
              <Text style={styles.reliabilityStripQueue}>
                Очередь · {outboxCount}
              </Text>
            ) : (
              <Text style={styles.reliabilityStripSync}>Все отправлено</Text>
            )}
          </View>
          <Text style={styles.statusSub}>
            {buildLiveSessionStatusSubline(session, arenaScheduleCtx)}
          </Text>
          {sessionMeaningOneLine ? (
            <Text style={styles.meaningInlineHint} numberOfLines={2}>
              {sessionMeaningOneLine}
            </Text>
          ) : null}
        </View>

        {microGuidance && microGuidance.cues.length > 0 ? (
          <>
            <View style={styles.hudDivider} />
            <Text style={styles.microGuidanceKicker}>Фокус сейчас</Text>
            {microGuidance.cues.map((c, i) => (
              <View key={`mg-${i}`} style={styles.microCueRow}>
                <Text
                  style={[
                    styles.microCueBadge,
                    c.tone === "check"
                      ? styles.microCueBadgeCheck
                      : c.tone === "reinforce"
                        ? styles.microCueBadgeReinforce
                        : styles.microCueBadgeFocus,
                  ]}
                >
                  {microGuidanceToneLabelRu(c.tone)}
                </Text>
                <Text style={styles.microCueTitle} numberOfLines={2}>
                  {c.title}
                </Text>
              </View>
            ))}
            {microGuidance.sourceNote ? (
              <Text style={styles.microGuidanceNote} numberOfLines={2}>
                {microGuidance.sourceNote}
              </Text>
            ) : null}
          </>
        ) : null}
      </GlassCardV2>
      </Reanimated.View>

      {planningSnap?.previousSessionNextActionsCarryV1 &&
      previousSessionCarryHasDisplayable(planningSnap.previousSessionNextActionsCarryV1) ? (
        <LivePreviousSessionCarryBlock carry={planningSnap.previousSessionNextActionsCarryV1} />
      ) : null}

      {planningSnap?.confirmedExternalDevelopmentCarry &&
      confirmedExternalCarryHasDisplayable(planningSnap.confirmedExternalDevelopmentCarry) ? (
        <LiveConfirmedExternalCoachCarryBlock
          carry={planningSnap.confirmedExternalDevelopmentCarry}
          rosterNameById={rosterNameById}
        />
      ) : null}

      {planningSnap?.externalCoachFeedbackCarry &&
      externalCoachFeedbackCarryHasDisplayable(planningSnap.externalCoachFeedbackCarry) ? (
        <LiveExternalCoachFeedbackCarryBlock carry={planningSnap.externalCoachFeedbackCarry} />
      ) : null}

      <GlassCardV2 padding="lg" glow={listeningGlow} style={styles.liveObservationsSection}>
        <Text style={styles.quickKicker}>Наблюдения</Text>

        <View style={styles.arenaRow}>
          <Animated.View style={{ transform: [{ scale: arenaMicScale }] }}>
            <Ionicons
              name={arena.isSpeechAvailable ? "mic" : "mic-off"}
              size={28}
              color={
                arena.uiPhase === "listening"
                  ? theme.colors.primary
                  : arena.isSpeechAvailable
                    ? theme.colors.success
                    : theme.colors.textMuted
              }
            />
          </Animated.View>
          <View style={styles.arenaTextCol}>
            <Text style={styles.voiceStatusText}>
              {arena.clarifyPhase !== "none" && arena.uiPhase === "idle"
                ? arena.clarifyPhase === "player"
                  ? ARENA_UI_CLARIFY_PLAYER
                  : arena.clarifyPhase === "target"
                    ? ARENA_UI_CLARIFY_TARGET
                    : ARENA_UI_CLARIFY_MEANING
                : arena.uiPhase === "idle"
                  ? ARENA_UI_STATUS_IDLE
                  : arena.uiPhase === "listening"
                    ? ARENA_UI_STATUS_LISTENING
                    : ARENA_UI_STATUS_PROCESSING}
            </Text>
            {!arena.isSpeechAvailable ? (
              <Text style={styles.arenaMuted}>
                {Platform.OS === "web" ? ARENA_UI_MIC_OFF_WEB : ARENA_UI_MIC_OFF_BUILD}
              </Text>
            ) : null}
            {arena.lastTranscript.trim() ? (
              <Text style={styles.arenaTranscript} numberOfLines={3}>
                {arena.lastTranscript.trim()}
              </Text>
            ) : null}
          </View>
          {arena.uiPhase === "processing" ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : null}
        </View>
        {arena.error ? (
          <View style={styles.voiceErrorRow}>
            <View style={styles.voiceErrorTextCol}>
              <Text style={styles.voiceErrorText}>{arena.error}</Text>
              <Text style={styles.voiceErrorHint}>{ARENA_UI_ERROR_HINT}</Text>
              {Platform.OS !== "web" ? (
                <Pressable
                  onPress={() => void Linking.openSettings()}
                  style={styles.voiceSettingsLinkWrap}
                  hitSlop={8}
                >
                  <Text style={styles.voiceSettingsLink}>Открыть настройки приложения</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => arena.clearError()} hitSlop={8}>
              <Text style={styles.voiceErrorDismiss}>Скрыть</Text>
            </Pressable>
          </View>
        ) : null}

        {captureFeedback ? (
          <Animated.View
            style={{ opacity: captureFeedbackOpacity }}
            pointerEvents="none"
          >
            <View style={styles.captureFeedbackHud}>
              <Text style={styles.captureFeedbackText}>{captureFeedback.text}</Text>
            </View>
          </Animated.View>
        ) : null}

        <TextInput
          value={quickText}
          onChangeText={setQuickText}
          placeholder="Текст, если без микрофона…"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={styles.quickInput}
        />

        <View style={styles.captureMetaBlock}>
          <View style={styles.captureMetaRow}>
            <Pressable
              onPress={() => {
                coachHapticSelection();
                setPlayerRowTouched(true);
                setPlayerPickFromAssistant(false);
                setPlayerPick(null);
              }}
              style={({ pressed }) => {
                const on = playerPick === null;
                const soft = on && !playerRowTouched;
                const firm = on && playerRowTouched;
                return [
                  styles.captureChip,
                  soft && styles.captureChipOnSoft,
                  firm && styles.captureChipOn,
                  pressed && styles.pressed,
                ];
              }}
            >
              <Text
                style={[
                  styles.captureChipText,
                  playerPick === null &&
                    !playerRowTouched &&
                    styles.captureChipTextOnSoft,
                  playerPick === null && playerRowTouched && styles.captureChipTextOn,
                ]}
                numberOfLines={1}
              >
                Без игрока
              </Text>
            </Pressable>
            {roster.map((p) => {
              const on = playerPick === p.id;
              const softPlayer = on && playerPickFromAssistant && !playerRowTouched;
              const firmPlayer = on && (!playerPickFromAssistant || playerRowTouched);
              return (
              <Pressable
                key={p.id}
                onPress={() => {
                  coachHapticSelection();
                  setPlayerRowTouched(true);
                  setPlayerPickFromAssistant(false);
                  setPlayerPick(p.id);
                }}
                style={({ pressed }) => [
                  styles.captureChip,
                  softPlayer && styles.captureChipOnSoft,
                  firmPlayer && styles.captureChipOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.captureChipText,
                    softPlayer && styles.captureChipTextOnSoft,
                    firmPlayer && styles.captureChipTextOn,
                  ]}
                  numberOfLines={1}
                >
                  {shortPlayerName(p.name)}
                </Text>
              </Pressable>
            );
            })}
          </View>
          <View style={styles.captureMetaRowBottom}>
            <View style={styles.sentimentRowCompact}>
              {SENTIMENT_OPTIONS.map((s) => {
                const selected = sentimentPick === s.key;
                const softNeutral = selected && s.key === "neutral" && !sentimentRowTouched;
                const firm = selected && (sentimentRowTouched || s.key !== "neutral");
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => {
                      coachHapticSelection();
                      setSentimentRowTouched(true);
                      setSentimentPick(s.key);
                    }}
                    style={({ pressed }) => [
                      styles.sentimentChipCompact,
                      softNeutral && styles.sentimentChipCompactOnSoft,
                      firm && styles.sentimentChipCompactOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sentimentChipCompactText,
                        softNeutral && styles.sentimentChipCompactTextOnSoft,
                        firm && styles.sentimentChipCompactTextOn,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={categoryDraft}
              onChangeText={setCategoryDraft}
              placeholder="Категория (необязательно)"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.categoryInputCompact,
                categoryDraft.trim().length === 0 && styles.categoryInputCompactOptional,
              ]}
            />
          </View>
        </View>

        <PrimaryButton
          title={submittingObs ? "Сохранение…" : "Добавить наблюдение"}
          onPress={() => void onQuickObservation()}
          disabled={submittingObs}
          animatedPress
          glow={!submittingObs}
        />
      </GlassCardV2>

        <GlassCardV2 padding="md">
          {outboxCount > 0 ? (
            <>
              <PrimaryButton
                title={flushingOutbox ? "Отправка…" : "Отправить очередь"}
                onPress={() => void flushOutbox().catch(alertLiveTrainingOutboxFlushError)}
                disabled={flushingOutbox || finishing}
                animatedPress
              />
              <View style={styles.hudStackGap} />
            </>
          ) : null}
          <View style={styles.actionsRow}>
            <SecondaryButton
              title={paused ? "Продолжить" : "Пауза"}
              active={paused}
              onPress={() => {
                coachHapticSelection();
                togglePause();
              }}
            />
            <View style={styles.actionsFlex}>
              <PrimaryButton
                title={finishing ? "Завершение…" : "Завершить"}
                onPress={() => void onFinish()}
                disabled={finishing || flushingOutbox}
                variant="outline"
                animatedPress
              />
            </View>
          </View>
        </GlassCardV2>
        <Pressable onPress={() => setDetailsExpanded((v) => !v)} style={styles.detailsToggleWrap}>
          <Text style={styles.detailsToggleText}>
            {detailsExpanded ? "Скрыть детали" : "Показать детали"}
          </Text>
        </Pressable>

      {detailsExpanded ? (
        <>
        {showArenaCompanion ? (
          <View
            accessible={Boolean(showSessionNudgeStrip && sessionNudgeBanner)}
            accessibilityLabel={
              showSessionNudgeStrip && sessionNudgeBanner
                ? `Арена: ${sessionNudgeBanner.line}`
                : undefined
            }
          >
          <GlassCardV2 padding="none">
            {showSessionNudgeStrip && sessionNudgeBanner ? (
              <View style={styles.arenaCompanionNudgeBlock}>
                <View style={styles.inSessionNudgeRow}>
                  <View style={styles.inSessionNudgeTextCol}>
                    <Text style={styles.inSessionNudgeKicker}>Подсказка</Text>
                    <Text style={styles.inSessionNudgeLine} numberOfLines={2}>
                      {sessionNudgeBanner.line}
                    </Text>
                  </View>
                  {sessionNudgeBanner.action ? (
                    <PressableFeedback
                      style={[
                        styles.inSessionNudgeCta,
                        nudgeCtaBusy && styles.inSessionNudgeCtaDisabled,
                      ]}
                      onPress={() => void onNudgeActionCta()}
                      disabled={nudgeCtaBusy}
                      hapticOnPress
                    >
                      <Text style={styles.inSessionNudgeCtaText}>
                        {nudgeCtaBusy ? "…" : sessionNudgeBanner.action.ctaLabelRu}
                      </Text>
                    </PressableFeedback>
                  ) : null}
                </View>
              </View>
            ) : null}
            {showSessionNudgeStrip && sessionNudgeBanner && showArenaCompanionMemory ? (
              <View style={styles.arenaCompanionDivider} />
            ) : null}
            {showArenaCompanionMemory ? (
              <View style={styles.arenaCompanionMemoryBlock}>
                <Text style={styles.sessionActionMemoryKicker}>Зафиксировано</Text>
                {inSessionActionMemoryView.preview.map((it) => {
                  const line = clipMemoryTitle(it.title, 52);
                  const prefix = it.kind === "team" ? "Команда · " : "";
                  if (it.playerId) {
                    return (
                      <Pressable
                        key={it.dedupeKey}
                        onPress={() => {
                          coachHapticSelection();
                          router.push(
                            `/player/${encodeURIComponent(it.playerId!)}` as Parameters<
                              typeof router.push
                            >[0]
                          );
                        }}
                        style={({ pressed }) => [
                          styles.sessionActionMemoryRow,
                          pressed && styles.sessionActionMemoryRowPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Открыть карточку игрока: ${line}`}
                      >
                        <Text style={styles.sessionActionMemoryRowText}>
                          {prefix}
                          {line}
                        </Text>
                      </Pressable>
                    );
                  }
                  return (
                    <View key={it.dedupeKey} style={styles.sessionActionMemoryRowStatic}>
                      <Text style={styles.sessionActionMemoryRowText}>
                        {prefix}
                        {line}
                      </Text>
                    </View>
                  );
                })}
                {inSessionActionMemoryView.moreCount > 0 ? (
                  <Text style={styles.sessionActionMemoryMore}>
                    ещё {inSessionActionMemoryView.moreCount}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </GlassCardV2>
          </View>
        ) : null}

        {showStartPriorityHandoff && startPrio ? (
          <SectionCard elevated style={styles.startPrioCard}>
            <Text style={styles.startPrioKicker}>Старт</Text>
            {startPrio.summaryLine ? (
              <Text style={styles.startPrioSummary}>{startPrio.summaryLine}</Text>
            ) : null}
            {startPrio.primaryPlayers.length > 0 ? (
              <>
                <Text style={styles.startPrioSectionLbl}>Игроки</Text>
                {startPrio.primaryPlayers.slice(0, 2).map((p) => (
                  <Text key={p.playerId} style={styles.startPrioBullet}>
                    • {shortPlayerName(p.playerName)}
                    {p.reason && p.reason !== "—"
                      ? ` — ${p.reason.length > 64 ? `${p.reason.slice(0, 63)}…` : p.reason}`
                      : ""}
                  </Text>
                ))}
              </>
            ) : null}
            {startPrio.primaryDomains.length > 0 ? (
              <>
                <Text style={styles.startPrioSectionLbl}>Темы</Text>
                {startPrio.primaryDomains.slice(0, 2).map((d) => (
                  <Text key={d.domain} style={styles.startPrioBullet}>
                    • {d.labelRu}
                  </Text>
                ))}
              </>
            ) : null}
            {startPrio.reinforcementItems.length > 0 ? (
              <>
                <Text style={styles.startPrioSectionLbl}>Закрепление</Text>
                {startPrio.reinforcementItems.map((line, i) => (
                  <Text key={`sp-r-${i}`} style={styles.startPrioBulletMuted}>
                    • {line.length > 120 ? `${line.slice(0, 117)}…` : line}
                  </Text>
                ))}
              </>
            ) : null}
          </SectionCard>
        ) : null}

        {showPlanningContext && planningSnap ? (
          <SectionCard elevated style={styles.ctxCard}>
            <Pressable
              onPress={() => {
                coachHapticSelection();
                setContextExpanded((v) => !v);
              }}
              style={styles.ctxHeader}
            >
              <View style={styles.ctxHeaderText}>
                <Text style={styles.ctxKicker}>План</Text>
                {!contextExpanded ? (
                  <Text style={styles.ctxCollapsed} numberOfLines={2}>
                    {contextCollapsedHint}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={contextExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.colors.textMuted}
              />
            </Pressable>
            {contextExpanded ? (
              <View style={styles.ctxBody}>
                {planningSnap.summaryLines.slice(0, 3).map((line, i) => (
                  <Text key={`ctx-sl-${i}`} style={styles.ctxLine}>
                    {line}
                  </Text>
                ))}
                {planningSnap.focusPlayers.length > 0 ? (
                  <>
                    <Text style={styles.ctxSectionLbl}>Игроки</Text>
                    {planningSnap.focusPlayers.slice(0, 3).map((p) => (
                      <Text key={p.playerId} style={styles.ctxBullet}>
                        • {shortPlayerName(p.playerName)}
                        {p.reasons[0]
                          ? ` — ${p.reasons[0].length > 72 ? `${p.reasons[0].slice(0, 71)}…` : p.reasons[0]}`
                          : ""}
                      </Text>
                    ))}
                  </>
                ) : null}
                {planningSnap.focusDomains.length > 0 ? (
                  <>
                    <Text style={styles.ctxSectionLbl}>Темы</Text>
                    {planningSnap.focusDomains.slice(0, 3).map((d) => (
                      <Text key={d.domain} style={styles.ctxBullet}>
                        • {d.labelRu}
                      </Text>
                    ))}
                  </>
                ) : null}
                {planningSnap.reinforceAreas.length > 0 ? (
                  <>
                    <Text style={styles.ctxSectionLbl}>Закрепление / дожим</Text>
                    {planningSnap.reinforceAreas.slice(0, 4).map((r) => (
                      <Text key={r.domain} style={styles.ctxBulletMuted}>
                        • {r.labelRu}
                        {r.reason && r.reason !== "—"
                          ? ` — ${
                              r.reason.length > 96 ? `${r.reason.slice(0, 93)}…` : r.reason
                            }`
                          : ""}
                      </Text>
                    ))}
                  </>
                ) : null}
                {planningSnap.suggestionSeeds &&
                planningSnap.suggestionSeeds.source === "report_action_layer" &&
                planningSnap.suggestionSeeds.items.length > 0 ? (
                  <>
                    <Text style={styles.ctxSectionLbl}>Ориентиры из отчётов</Text>
                    {planningSnap.suggestionSeeds.items.slice(0, 6).map((line, i) => (
                      <Text key={`ss-${i}`} style={styles.ctxSeedTrace}>
                        · {line.length > 200 ? `${line.slice(0, 197)}…` : line}
                      </Text>
                    ))}
                  </>
                ) : null}
                {seedContextView && seedContextView.blocks.length > 0 ? (
                  <View style={styles.seedBlocksWrap}>
                    <Text style={styles.ctxSectionLbl}>Блоки тренировки</Text>
                    {seedContextView.lowData ? (
                      <Text style={styles.seedBlocksLowData}>Краткий ориентир по плану.</Text>
                    ) : null}
                    {seedContextView.blocks.map((b, i) => (
                      <View key={`ctx-seed-${b.type}-${i}`}>
                        <GlassCardV2
                          padding="sm"
                          style={i > 0 ? styles.seedBlockGlassSpacing : undefined}
                        >
                          <Text style={styles.seedBlockTitle}>{b.title}</Text>
                          <Text style={styles.seedBlockDesc} numberOfLines={3}>
                            {b.shortDescription}
                          </Text>
                          {b.domainLabels.length > 0 ? (
                            <View style={styles.seedChipRow}>
                              {b.domainLabels.map((label) => (
                                <View key={`${b.type}-d-${label}`} style={styles.seedChip}>
                                  <Text style={styles.seedChipText}>{label}</Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                          {b.focusPlayers.length > 0 ? (
                            <View style={styles.seedChipRow}>
                              {b.focusPlayers.map((name) => (
                                <View key={`${b.type}-p-${name}`} style={styles.seedChipPlayer}>
                                  <Text style={styles.seedChipPlayerText}>{name}</Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </GlassCardV2>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {showGuidance && guidancePayload ? (
          <SectionCard elevated style={styles.guidanceCard}>
            <Pressable
              onPress={() => {
                coachHapticSelection();
                setGuidanceExpanded((v) => !v);
              }}
              style={styles.guidanceHeader}
            >
              <View style={styles.guidanceHeaderText}>
                <Text style={styles.guidanceKicker}>Ориентиры</Text>
                {!guidanceExpanded ? (
                  <Text style={styles.guidanceCollapsed} numberOfLines={2}>
                    {guidanceCollapsedPreview}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={guidanceExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.colors.textMuted}
              />
            </Pressable>
            {guidancePayload.lowData ? (
              <Text style={styles.guidanceLowDataHint}>Мало данных — ориентиры общие.</Text>
            ) : null}
            {guidanceExpanded ? (
              <View style={styles.guidanceList}>
                {guidancePayload.cues.map((cue) => {
                  const blockTag = guidanceSourceBlockLabelRu(cue.sourceBlockType);
                  return (
                    <View
                      key={cue.id}
                      style={[
                        styles.guidanceCueRow,
                        { borderLeftColor: guidanceCueBorderColor(cue.tone) },
                      ]}
                    >
                      {blockTag ? <Text style={styles.guidanceCueBlockTag}>{blockTag}</Text> : null}
                      <Text style={styles.guidanceCueTitle}>{cue.title}</Text>
                      {cue.body ? <Text style={styles.guidanceCueBody}>{cue.body}</Text> : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {liveSessionDevelopmentBlocks.length > 0 ? (
          <SectionCard elevated style={styles.arenaLiveDevCard}>
            <Text style={styles.arenaLiveDevKicker}>Развитие в смене</Text>
            <Text style={styles.arenaLiveDevHint}>
              До 3 зон на игрока — по фразам и категориям наблюдений.
            </Text>
            {liveSessionDevelopmentBlocks.map((b) => (
              <View key={b.playerId} style={styles.arenaLiveDevPlayerBlock}>
                <Text style={styles.arenaLiveDevPlayerName}>{b.playerLabel}</Text>
                {b.zones.map((z) => (
                  <Text
                    key={z.domain}
                    style={styles.arenaLiveDevZoneLine}
                    numberOfLines={1}
                    accessibilityLabel={formatDevelopmentZoneLine(z)}
                  >
                    {formatDevelopmentZoneLine(z)}
                  </Text>
                ))}
              </View>
            ))}
          </SectionCard>
        ) : null}

        <SectionCard elevated style={styles.eventsCard}>
          <Text style={styles.eventsKicker}>Лента</Text>
          {eventsLoading ? (
            <Text style={styles.eventsStub}>Загрузка…</Text>
          ) : events.length === 0 ? (
            <Text style={styles.eventsStub}>Пока пусто — Арена или ввод ниже.</Text>
          ) : (
            events.slice(0, 15).map((ev, evIndex) => (
              <LiveTrainingEventRow key={ev.id} ev={ev} index={evIndex} />
            ))
          )}
        </SectionCard>
        </>
      ) : null}
    </FlagshipScreen>
  );
}

export default LiveTrainingScreen;

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.layout.screenBottom + theme.spacing.xl + theme.spacing.md,
  },
  heroGlassContent: {
    alignItems: "center",
  },
  meaningInlineHint: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  prevCarryCard: {
    marginBottom: theme.spacing.md,
  },
  prevCarryKicker: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: theme.spacing.sm,
  },
  prevCarrySubkicker: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  prevCarrySubkickerSpaced: {
    marginTop: 10,
  },
  prevCarryLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  prevCarryLineMuted: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: 3,
  },
  prevCarryPlayerBlock: {
    marginBottom: theme.spacing.sm,
  },
  prevCarryPlayerName: {
    ...theme.typography.subtitle,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  liveObservationsSection: {
    marginTop: theme.spacing.sm,
  },
  hudDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(160, 200, 255, 0.12)",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    alignSelf: "stretch",
  },
  hudStackGap: {
    height: theme.spacing.md,
  },
  captureFeedbackHud: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(96, 165, 250, 0.65)",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  seedBlockGlassSpacing: {
    marginTop: theme.spacing.sm,
  },
  teamTitle: {
    ...theme.typography.title,
    fontSize: 22,
    textAlign: "center",
  },
  modeLine: {
    ...theme.typography.subtitle,
    color: "rgba(240, 244, 248, 0.88)",
    marginTop: theme.spacing.xs,
  },
  slotTimeLine: {
    ...theme.typography.caption,
    color: "rgba(240, 244, 248, 0.78)",
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  timer: {
    fontSize: 44,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  microGuidanceKicker: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.55,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  microCueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  microCueBadge: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 1,
  },
  microCueBadgeFocus: {
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  microCueBadgeCheck: {
    color: theme.colors.warning,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
  },
  microCueBadgeReinforce: {
    color: theme.colors.textSecondary,
    backgroundColor: "rgba(120, 120, 128, 0.12)",
  },
  microCueTitle: {
    ...theme.typography.body,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.text,
  },
  microGuidanceNote: {
    ...theme.typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  heroOperationalBlock: {
    marginTop: theme.spacing.md,
    width: "100%",
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  reliabilityStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    width: "100%",
  },
  reliabilityStripLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reliabilityStripLabel: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
  },
  reliabilityStripPause: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  reliabilityStripSending: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  reliabilityStripQueue: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  reliabilityStripSync: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  statusSub: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
    textAlign: "center",
    width: "100%",
  },
  arenaCompanionNudgeBlock: {
    backgroundColor: theme.colors.primaryMuted,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  arenaCompanionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  arenaCompanionMemoryBlock: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  inSessionNudgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  inSessionNudgeTextCol: {
    flex: 1,
  },
  inSessionNudgeKicker: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: 2,
  },
  inSessionNudgeLine: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  inSessionNudgeCta: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primary,
  },
  inSessionNudgeCtaDisabled: {
    opacity: 0.55,
  },
  inSessionNudgeCtaText: {
    ...theme.typography.caption,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  sessionActionMemoryKicker: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  sessionActionMemoryRow: {
    paddingVertical: 2,
  },
  sessionActionMemoryRowStatic: {
    paddingVertical: 2,
  },
  sessionActionMemoryRowPressed: {
    opacity: 0.75,
  },
  sessionActionMemoryRowText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  sessionActionMemoryMore: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  startPrioCard: {
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  startPrioKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  startPrioSummary: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  startPrioSectionLbl: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  startPrioBullet: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  startPrioBulletMuted: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
  },
  ctxCard: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  ctxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  ctxHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  ctxKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ctxCollapsed: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  ctxBody: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  ctxLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  ctxSectionLbl: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ctxBullet: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 2,
  },
  ctxBulletMuted: {
    ...theme.typography.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginBottom: 4,
  },
  ctxSeedTrace: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  seedBlocksWrap: {
    marginTop: theme.spacing.xs,
  },
  seedBlocksLowData: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  seedBlockTitle: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.text,
  },
  seedBlockDesc: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  seedChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  seedChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  seedChipPlayer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  seedChipText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  seedChipPlayerText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  guidanceCard: {
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  guidanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  guidanceHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  guidanceKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  guidanceCollapsed: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  guidanceLowDataHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  guidanceList: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  guidanceCueRow: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: theme.borderRadius.sm,
  },
  guidanceCueBlockTag: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  guidanceCueTitle: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.text,
  },
  guidanceCueBody: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    alignItems: "center",
  },
  actionsFlex: {
    flex: 1,
  },
  detailsToggleWrap: {
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    alignSelf: "flex-start",
  },
  detailsToggleText: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  captureFeedbackText: {
    ...theme.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  quickKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  quickInput: {
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: theme.spacing.sm,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  captureMetaBlock: {
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  captureMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  captureMetaRowBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  captureChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    maxWidth: 120,
  },
  captureChipOn: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  captureChipOnSoft: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  captureChipText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  captureChipTextOn: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  captureChipTextOnSoft: {
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  sentimentRowCompact: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  sentimentChipCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sentimentChipCompactOn: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  sentimentChipCompactOnSoft: {
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sentimentChipCompactText: {
    fontSize: 11,
    color: theme.colors.text,
  },
  sentimentChipCompactTextOn: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  sentimentChipCompactTextOnSoft: {
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  categoryInputCompact: {
    ...theme.typography.caption,
    flex: 1,
    minWidth: 120,
    fontSize: 13,
    color: theme.colors.text,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  categoryInputCompactOptional: {
    opacity: 0.92,
    borderStyle: "dashed",
  },
  arenaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  arenaTextCol: {
    flex: 1,
    gap: 4,
  },
  arenaMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  arenaTranscript: {
    ...theme.typography.body,
    fontSize: 14,
    color: "rgba(240, 244, 248, 0.92)",
    lineHeight: 20,
    marginTop: 2,
    fontWeight: "400",
  },
  voiceStatusText: {
    ...theme.typography.subtitle,
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
    fontWeight: "600",
  },
  voiceErrorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.error + "18",
  },
  voiceErrorTextCol: {
    flex: 1,
    gap: 4,
  },
  voiceErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    lineHeight: 18,
  },
  voiceErrorHint: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  voiceSettingsLinkWrap: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  voiceSettingsLink: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  voiceErrorDismiss: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  arenaLiveDevCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  arenaLiveDevKicker: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  arenaLiveDevHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  arenaLiveDevPlayerBlock: {
    marginBottom: theme.spacing.sm,
  },
  arenaLiveDevPlayerName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 2,
  },
  arenaLiveDevZoneLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  eventsCard: {
    marginTop: theme.spacing.sm,
  },
  eventsKicker: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.45,
    marginBottom: theme.spacing.xs,
  },
  eventsStub: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  errorWrap: {
    paddingBottom: theme.layout.screenBottom + theme.spacing.xl,
    gap: theme.spacing.md,
  },
  errorBtn: {
    marginTop: theme.spacing.sm,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});

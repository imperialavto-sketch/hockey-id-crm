/**
 * PHASE 3: `COACH_CANONICAL_LIVE_FLOW` — `liveTrainingService` only (`docs/PHASE_3_APP_FLOW_LOCK.md`).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { coachHapticSelection, coachHapticSuccess } from "@/lib/coachHaptics";
import Reanimated from "react-native-reanimated";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import {
  entryAfterHero,
  listItemReveal,
  screenReveal,
  STAGGER,
} from "@/lib/animations";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import { getCoachTeams, type CoachTeamItem } from "@/services/coachTeamsService";
import {
  startLiveTrainingSession,
  LiveTrainingSessionConflictError,
  getLiveTrainingSession,
  fetchLiveTrainingStartPlanning,
  type CoachCrossSessionContinuitySummaryDto,
  type LiveTrainingStartPlanningSummary,
  type LiveTrainingStartPriorities,
} from "@/services/liveTrainingService";
import { ApiRequestError } from "@/lib/api";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";
import {
  buildLiveTrainingStartClosedLoopPrep,
  liveTrainingStartClosedLoopPrepHasContent,
  type LiveTrainingStartClosedLoopPrep,
} from "@/lib/liveTrainingStartCarryForwardViewModel";
import type { LiveTrainingMode, LiveTrainingPlanningSnapshot } from "@/types/liveTraining";
import {
  buildScheduleSlotContextForSessionStart,
  parseScheduleRouteContext,
  resolveLiveTrainingScheduleRouteContext,
  scheduleRouteQuerySuffix,
} from "@/lib/liveTrainingScheduleRouteContext";
import { mergeFinalizeCarryForwardSeedIntoPlanningSnapshot } from "@/lib/liveTrainingCarryForwardSeedMerge";
import { mergeReportTaskSuggestionsIntoPlanningSnapshot } from "@/lib/liveTrainingReportSuggestionsMerge";
import {
  fetchCoachPlayerReportAnalytics,
  getCoachPlayerDetail,
  type CoachTrainingSessionReportAnalytics,
} from "@/services/coachPlayersService";

const MODES: LiveTrainingMode[] = ["ice", "ofp", "mixed"];

function crossSessionConfidenceHintRu(
  c: CoachCrossSessionContinuitySummaryDto["confidence"]
): string {
  if (c === "low") return "мало пересечений между слоями";
  if (c === "high") return "несколько независимых слоёв совпали";
  return "умеренно";
}

function CycleContextSummarySection({ model }: { model: CoachCrossSessionContinuitySummaryDto }) {
  const blocks: { title: string; lines: string[] }[] = [
    { title: "С прошлого цикла", lines: model.carryFromPreviousCycle },
    { title: "Повторяется сейчас", lines: model.recurringNow },
    { title: "Закрепление / стабилизация", lines: model.stabilizingAreas },
    { title: "Текущий фокус старта", lines: model.currentFocus },
  ];
  const hasAny = blocks.some((b) => b.lines.length > 0);
  if (!hasAny) return null;
  return (
    <SectionCard elevated style={styles.cycleContextCard}>
      <Text style={styles.cycleContextKicker}>Контекст цикла</Text>
      <Text style={styles.cycleContextMeta}>
        Плотность сигналов (эвристика): {crossSessionConfidenceHintRu(model.confidence)}
      </Text>
      {blocks.map(
        (b) =>
          b.lines.length > 0 ? (
            <View key={b.title} style={styles.cycleContextBlock}>
              <Text style={styles.cycleContextBlockTitle}>{b.title}</Text>
              {b.lines.map((line, i) => (
                <Text key={i} style={styles.cycleContextLine}>
                  · {line}
                </Text>
              ))}
            </View>
          ) : null
      )}
      {model.note ? <Text style={styles.cycleContextNote}>{model.note}</Text> : null}
    </SectionCard>
  );
}

function carryForwardPlayerSourceLabelRu(
  source:
    | "follow_up"
    | "recent_wrap_up"
    | "planning_focus"
    | "continuity_lock_in"
    | "unresolved_priority_carry_forward"
) {
  if (source === "follow_up") return "follow-up";
  if (source === "recent_wrap_up") return "последняя сессия";
  if (source === "continuity_lock_in") return "зафиксировано";
  if (source === "unresolved_priority_carry_forward") return "прошлый старт";
  return "планирование";
}

function carryForwardDomainSourceLabelRu(
  source:
    | "follow_up"
    | "recent_wrap_up"
    | "planning_focus"
    | "continuity_lock_in"
    | "unresolved_priority_carry_forward"
) {
  if (source === "follow_up") return "follow-up";
  if (source === "recent_wrap_up") return "последняя сессия";
  if (source === "continuity_lock_in") return "зафиксировано";
  if (source === "unresolved_priority_carry_forward") return "прошлый старт";
  return "планирование";
}

function hasStartPrioritiesBody(sp: LiveTrainingStartPriorities | undefined): boolean {
  if (!sp) return false;
  return (
    Boolean(sp.summaryLine?.trim()) ||
    sp.primaryPlayers.length > 0 ||
    sp.primaryDomains.length > 0 ||
    sp.secondaryItems.length > 0 ||
    sp.reinforcementItems.length > 0
  );
}

/** Низкий сигнал: один короткий блок без вторичных секций */
function isStartPrioritiesCompact(sp: LiveTrainingStartPriorities): boolean {
  if (!sp.lowData) return false;
  if (sp.secondaryItems.length > 0 || sp.reinforcementItems.length > 0) return false;
  return sp.primaryPlayers.length + sp.primaryDomains.length <= 1;
}

/** Компактный closed loop: complete → этот старт (данные уже в start-planning). */
function ClosedLoopPrepSection({
  prep,
  busy,
  loadError,
  onOpenPlayer,
}: {
  prep: LiveTrainingStartClosedLoopPrep;
  busy: boolean;
  loadError: string | null;
  onOpenPlayer: (playerId: string) => void;
}) {
  const has = liveTrainingStartClosedLoopPrepHasContent(prep);
  return (
    <View style={styles.closedLoopWrap}>
      <Text style={styles.closedLoopTitle}>С прошлого занятия</Text>
      {busy ? (
        <View style={styles.centerRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.muted}>Подтягиваем перенос…</Text>
        </View>
      ) : loadError ? (
        <Text style={styles.muted}>Мост с прошлой тренировки недоступен — фокус ниже всё равно можно использовать.</Text>
      ) : !has ? (
        <Text style={styles.muted}>
          Пока нет явного переноса — первый старт или ещё мало подтверждённых live-сессий для команды.
        </Text>
      ) : (
        <>
          {prep.fromLastSession.length > 0 ? (
            <>
              <Text style={[styles.closedLoopBlockTitle, styles.closedLoopBlockTitleFirst]}>Коротко</Text>
              {prep.fromLastSession.map((line, i) => (
                <Text key={`fl-${i}`} style={styles.closedLoopBullet}>
                  • {line}
                </Text>
              ))}
            </>
          ) : null}

          {prep.teamGroupAccent.length > 0 ? (
            <>
              <Text
                style={[
                  styles.closedLoopBlockTitle,
                  prep.fromLastSession.length === 0 ? styles.closedLoopBlockTitleFirst : null,
                ]}
              >
                Пятёрка и сессия
              </Text>
              {prep.teamGroupAccent.map((line, i) => (
                <Text key={`tg-${i}`} style={styles.closedLoopLine}>
                  {line}
                </Text>
              ))}
            </>
          ) : null}

          {prep.playersInFocus.length > 0 ? (
            <>
              <Text
                style={[
                  styles.closedLoopBlockTitle,
                  prep.fromLastSession.length === 0 && prep.teamGroupAccent.length === 0
                    ? styles.closedLoopBlockTitleFirst
                    : null,
                ]}
              >
                Игроки в фокусе
              </Text>
              {prep.playersInFocus.map((p) => (
                <Pressable
                  key={p.playerId}
                  onPress={() => onOpenPlayer(p.playerId)}
                  style={({ pressed }) => [styles.closedLoopPlayerRow, pressed && styles.pressed]}
                >
                  <Text style={styles.closedLoopPlayerName}>{p.displayName}</Text>
                  {p.note ? <Text style={styles.closedLoopPlayerNote}>{p.note}</Text> : null}
                </Pressable>
              ))}
            </>
          ) : null}

          {prep.themesForToday.length > 0 ? (
            <>
              <Text
                style={[
                  styles.closedLoopBlockTitle,
                  prep.fromLastSession.length === 0 &&
                  prep.teamGroupAccent.length === 0 &&
                  prep.playersInFocus.length === 0
                    ? styles.closedLoopBlockTitleFirst
                    : null,
                ]}
              >
                Темы на сегодня
              </Text>
              <Text style={styles.closedLoopThemes}>{prep.themesForToday.join(" · ")}</Text>
            </>
          ) : null}

          {prep.unresolvedOrDeferred.length > 0 ? (
            <>
              <Text
                style={[
                  styles.closedLoopBlockTitle,
                  prep.fromLastSession.length === 0 &&
                  prep.teamGroupAccent.length === 0 &&
                  prep.playersInFocus.length === 0 &&
                  prep.themesForToday.length === 0
                    ? styles.closedLoopBlockTitleFirst
                    : null,
                ]}
              >
                Что не закрыто
              </Text>
              {prep.unresolvedOrDeferred.map((line, i) => (
                <Text key={`ud-${i}`} style={styles.closedLoopDeferred}>
                  {line}
                </Text>
              ))}
            </>
          ) : null}

          <Text style={styles.closedLoopFoot}>Детали фокуса и заготовки блоков — ниже.</Text>
        </>
      )}
    </View>
  );
}

function oneParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default function LiveTrainingStartScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<Record<string, string | string[]>>();
  const teamIdHint = oneParam(routeParams.teamId);
  const scheduleCtxFromRoute = useMemo(
    () =>
      parseScheduleRouteContext(
        routeParams as Record<string, string | string[] | undefined>
      ),
    [
      routeParams.ltSlot,
      routeParams.ltGid,
      routeParams.ltGnm,
      routeParams.ltS0,
      routeParams.ltS1,
      routeParams.ltSk,
    ]
  );
  const mountedRef = useRef(true);
  const focusActiveRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [teams, setTeams] = useState<CoachTeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [mode, setMode] = useState<LiveTrainingMode>("ice");
  const [starting, setStarting] = useState(false);
  const [planning, setPlanning] = useState<LiveTrainingStartPlanningSummary | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getCoachTeams()
      .then((data) => {
        if (!focusActiveRef.current) return;
        setTeams(data);
        setSelectedTeamId((prev) => {
          if (prev && data.some((t) => t.id === prev)) return prev;
          return data[0]?.id ?? null;
        });
      })
      .catch((err) => {
        if (!focusActiveRef.current) return;
        setTeams([]);
        setError(
          isAuthRequiredError(err)
            ? "Требуется авторизация"
            : err instanceof Error
              ? err.message
              : "Не удалось загрузить команды"
        );
      })
      .finally(() => {
        if (focusActiveRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!teams.length || !teamIdHint) return;
    if (teams.some((t) => t.id === teamIdHint)) {
      setSelectedTeamId(teamIdHint);
    }
  }, [teams, teamIdHint]);

  const ltSkHint = oneParam(routeParams.ltSk);
  useEffect(() => {
    if (ltSkHint === "ice" || ltSkHint === "ofp") {
      setMode(ltSkHint);
    }
  }, [ltSkHint]);

  const ltPlayerId = oneParam(routeParams.ltPlayerId)?.trim() || undefined;
  const [reportAnalyticsForStart, setReportAnalyticsForStart] =
    useState<CoachTrainingSessionReportAnalytics | null>(null);
  const [reportSuggLoading, setReportSuggLoading] = useState(false);
  const [hintPlayerTeamId, setHintPlayerTeamId] = useState<string | null>(null);
  const [useReportSuggestions, setUseReportSuggestions] = useState(() => Boolean(ltPlayerId));
  const [useCarryForwardSeed, setUseCarryForwardSeed] = useState(true);

  useEffect(() => {
    if (!ltPlayerId) {
      setReportAnalyticsForStart(null);
      setHintPlayerTeamId(null);
      setReportSuggLoading(false);
      return;
    }
    let cancelled = false;
    setReportSuggLoading(true);
    fetchCoachPlayerReportAnalytics(ltPlayerId)
      .then((d) => {
        if (!cancelled) setReportAnalyticsForStart(d);
      })
      .catch(() => {
        if (!cancelled) setReportAnalyticsForStart(null);
      })
      .finally(() => {
        if (!cancelled) setReportSuggLoading(false);
      });
    getCoachPlayerDetail(ltPlayerId)
      .then((p) => {
        if (!cancelled) setHintPlayerTeamId(p?.teamId?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setHintPlayerTeamId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ltPlayerId]);

  const reportSuggestionsTeamMismatch =
    Boolean(ltPlayerId && hintPlayerTeamId && selectedTeamId && hintPlayerTeamId !== selectedTeamId);

  useFocusEffect(
    useCallback(() => {
      focusActiveRef.current = true;
      load();
      return () => {
        focusActiveRef.current = false;
      };
    }, [load])
  );

  useEffect(() => {
    if (loading || error || !selectedTeamId) {
      setPlanning(null);
      setPlanningLoading(false);
      setPlanningError(null);
      return;
    }
    let cancelled = false;
    setPlanning(null);
    setPlanningLoading(true);
    setPlanningError(null);
    fetchLiveTrainingStartPlanning(selectedTeamId)
      .then((data) => {
        if (!cancelled) setPlanning(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setPlanning(null);
          setPlanningError(
            err instanceof Error ? err.message : "Не удалось загрузить фокус на тренировку"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPlanningLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, error, selectedTeamId]);

  const planningHasBody =
    !!planning &&
    (planning.focusPlayers.length > 0 ||
      planning.focusDomains.length > 0 ||
      planning.reinforceAreas.length > 0);

  const planningAwaitingFirstPaint =
    !!selectedTeamId &&
    !loading &&
    !error &&
    planning === null &&
    !planningError &&
    !planningLoading;

  const closedLoopPrep = useMemo(
    () => buildLiveTrainingStartClosedLoopPrep(planning),
    [planning]
  );

  const carryForwardSeedBody = useMemo(() => {
    const s = planning?.carryForwardSeed;
    if (!s || s.source !== "finalize_carry_forward") return null;
    if (
      s.worthRechecking.length === 0 &&
      s.possibleCarryForward.length === 0 &&
      s.optionalContextOnly.length === 0
    ) {
      return null;
    }
    return s;
  }, [planning?.carryForwardSeed]);

  const carrySeedPreviewLines = useMemo(() => {
    if (!carryForwardSeedBody) return [];
    const out: string[] = [];
    for (const x of carryForwardSeedBody.worthRechecking) {
      if (out.length >= 5) break;
      out.push(x);
    }
    for (const x of carryForwardSeedBody.possibleCarryForward) {
      if (out.length >= 5) break;
      out.push(x);
    }
    for (const x of carryForwardSeedBody.optionalContextOnly) {
      if (out.length >= 5) break;
      out.push(x);
    }
    return out;
  }, [carryForwardSeedBody]);

  useEffect(() => {
    if (carryForwardSeedBody) setUseCarryForwardSeed(true);
  }, [carryForwardSeedBody?.sessionId]);

  const closedLoopBusy =
    !!selectedTeamId && !loading && !error && (planningLoading || planningAwaitingFirstPaint);

  const priorityLabelRu = (p: "high" | "medium" | "low") => {
    if (p === "high") return "высокий";
    if (p === "medium") return "средний";
    return "низкий";
  };

  const onStart = async () => {
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) {
      Alert.alert("Команда", "Выберите команду или дождитесь загрузки списка.");
      return;
    }
    setStarting(true);
    try {
      let planningSnapshot: LiveTrainingPlanningSnapshot | undefined;
      if (
        planning &&
        planning.teamId === team.id &&
        !planningError &&
        !planningLoading
      ) {
        planningSnapshot = {
          generatedAt: new Date().toISOString(),
          teamId: team.id,
          focusPlayers: planning.focusPlayers,
          focusDomains: planning.focusDomains,
          reinforceAreas: planning.reinforceAreas,
          summaryLines: planning.summaryLines,
          planSeeds: planning.planSeeds,
          ...(planning.startPriorities ? { startPriorities: planning.startPriorities } : {}),
        };
        const suggList = reportAnalyticsForStart?.taskSuggestions?.suggestions;
        if (
          planningSnapshot &&
          useReportSuggestions &&
          !reportSuggestionsTeamMismatch &&
          Array.isArray(suggList) &&
          suggList.length > 0 &&
          reportAnalyticsForStart?.actionLayer
        ) {
          planningSnapshot = mergeReportTaskSuggestionsIntoPlanningSnapshot(
            planningSnapshot,
            suggList,
            reportAnalyticsForStart.actionLayer.confidence
          );
        }
        if (
          planningSnapshot &&
          useCarryForwardSeed &&
          planning?.carryForwardSeed?.source === "finalize_carry_forward"
        ) {
          planningSnapshot = mergeFinalizeCarryForwardSeedIntoPlanningSnapshot(
            planningSnapshot,
            planning.carryForwardSeed,
            { enabled: true }
          );
        }
      }
      const scheduleSlotContext = buildScheduleSlotContextForSessionStart({
        teamId: team.id,
        routeCtx: scheduleCtxFromRoute,
        liveMode: mode,
      });
      const session = await startLiveTrainingSession({
        teamId: team.id,
        teamName: team.name,
        mode,
        scheduleSlotContext,
        ...(planningSnapshot ? { planningSnapshot } : {}),
      });
      if (!mountedRef.current) return;
      coachHapticSuccess();
      const suffix = scheduleRouteQuerySuffix(
        resolveLiveTrainingScheduleRouteContext(
          session,
          routeParams as Record<string, string | string[] | undefined>
        )
      );
      router.replace(
        `/live-training/${session.id}/live${suffix}` as Parameters<typeof router.replace>[0]
      );
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof LiveTrainingSessionConflictError) {
        Alert.alert(
          "Уже есть тренировка",
          "Завершите или подтвердите текущую живую тренировку, затем начните новую.",
          [
            { text: "Отмена", style: "cancel" },
            {
              text: "Перейти",
              onPress: async () => {
                if (!mountedRef.current || !focusActiveRef.current) return;
                try {
                  const s = await getLiveTrainingSession(e.sessionId);
                  if (!mountedRef.current || !focusActiveRef.current) return;
                  const segment =
                    s?.status === "review"
                      ? "review"
                      : s?.status === "live"
                        ? "live"
                        : "review";
                  const sfx = scheduleRouteQuerySuffix(
                    resolveLiveTrainingScheduleRouteContext(
                      s,
                      routeParams as Record<string, string | string[] | undefined>
                    )
                  );
                  router.replace(
                    `/live-training/${e.sessionId}/${segment}${sfx}` as Parameters<
                      typeof router.replace
                    >[0]
                  );
                } catch {
                  if (!mountedRef.current || !focusActiveRef.current) return;
                  const sfx2 = scheduleRouteQuerySuffix(scheduleCtxFromRoute);
                  router.replace(
                    `/live-training/${e.sessionId}/live${sfx2}` as Parameters<
                      typeof router.replace
                    >[0]
                  );
                }
              },
            },
          ]
        );
      } else {
        const msg =
          e instanceof ApiRequestError
            ? e.message
            : "Не удалось начать тренировку. Попробуйте снова.";
        Alert.alert("Ошибка", msg);
      }
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  };

  return (
    <FlagshipScreen contentContainerStyle={styles.content}>
      <Reanimated.View entering={screenReveal(0)}>
        <Text style={styles.lead}>
          Выберите команду и тип занятия. После старта откроется экран живой тренировки с таймером.
        </Text>

        <SectionCard elevated style={styles.onboardingCard}>
          <Text style={styles.kicker}>Шаги CORE</Text>
          <Text style={styles.onboardingLine}>1. На живой тренировке удерживайте кнопку микрофона или введите текст.</Text>
          <Text style={styles.onboardingLine}>2. «Завершить» — перейти к проверке черновиков.</Text>
          <Text style={styles.onboardingLine}>3. Исправьте игрока/категорию при необходимости, затем «Подтвердить».</Text>
        </SectionCard>
      </Reanimated.View>

      <Reanimated.View entering={entryAfterHero(1)}>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Команда / группа</Text>
        {loading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.muted}>Загрузка…</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : teams.length === 0 ? (
          <Text style={styles.muted}>Нет доступных команд.</Text>
        ) : (
          <View style={styles.teamList}>
            {teams.map((t, i) => {
              const selected = t.id === selectedTeamId;
              return (
                <Reanimated.View
                  key={t.id}
                  entering={listItemReveal(i, STAGGER)}
                  style={styles.teamRowAnimWrap}
                >
                <Pressable
                  onPress={() => {
                    coachHapticSelection();
                    setSelectedTeamId(t.id);
                  }}
                  style={({ pressed }) => [
                    styles.teamRow,
                    i > 0 && styles.teamRowBorder,
                    selected && styles.teamRowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.teamName, selected && styles.teamNameSelected]}>{t.name}</Text>
                  <Text style={styles.teamMeta}>{t.playerCount} игроков</Text>
                </Pressable>
                </Reanimated.View>
              );
            })}
          </View>
        )}
      </SectionCard>
      </Reanimated.View>

      <Reanimated.View entering={entryAfterHero(2)}>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Тип тренировки</Text>
        <View style={styles.modeRow}>
          {MODES.map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  coachHapticSelection();
                  setMode(m);
                }}
                style={({ pressed }) => [
                  styles.modeChip,
                  active && styles.modeChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                  {formatLiveTrainingMode(m)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>
      </Reanimated.View>

      {selectedTeamId && !loading && !error ? (
        <Reanimated.View entering={entryAfterHero(3)}>
        <ClosedLoopPrepSection
          prep={closedLoopPrep}
          busy={closedLoopBusy}
          loadError={planningError}
          onOpenPlayer={(playerId) =>
            router.push(`/player/${encodeURIComponent(playerId)}` as Parameters<typeof router.push>[0])
          }
        />
        </Reanimated.View>
      ) : null}

      {selectedTeamId &&
      !loading &&
      !error &&
      carryForwardSeedBody &&
      !(planningLoading || planningAwaitingFirstPaint) ? (
        <Reanimated.View entering={entryAfterHero(4)}>
        <SectionCard elevated style={styles.prevCycleSeedCard}>
          <View style={styles.prevCycleSeedHeader}>
            <View style={styles.prevCycleSeedTitleCol}>
              <Text style={styles.prevCycleSeedKicker}>Из прошлой тренировки стоит удержать</Text>
              <Text style={styles.prevCycleSeedSub}>
                Опционально подмешать в снимок плана ориентиры из прошлого старта (слой отчётов). Не задачи и не
                финальный отчёт — можно отключить.
              </Text>
            </View>
            <Switch
              value={useCarryForwardSeed}
              onValueChange={setUseCarryForwardSeed}
              trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primaryMuted }}
              thumbColor={theme.colors.text}
            />
          </View>
          {carrySeedPreviewLines.map((line, i) => (
            <Text key={i} style={styles.prevCycleSeedLine}>
              · {line.length > 160 ? `${line.slice(0, 157)}…` : line}
            </Text>
          ))}
          <Text style={styles.prevCycleSeedFoot}>
            Ниже по приоритету, чем подсказки из отчёта игрока; совпадения с уже собранным фокусом не
            дублируются.
          </Text>
        </SectionCard>
        </Reanimated.View>
      ) : null}

      {selectedTeamId &&
      !loading &&
      !error &&
      planning?.continuitySummary &&
      !(planningLoading || planningAwaitingFirstPaint) ? (
        <Reanimated.View entering={entryAfterHero(5)}>
        <CycleContextSummarySection model={planning.continuitySummary} />
        </Reanimated.View>
      ) : null}

      <Reanimated.View entering={entryAfterHero(6)}>
      <SectionCard elevated style={styles.card}>
        <Text style={styles.kicker}>Фокус на следующую тренировку</Text>
        {loading ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.muted}>Загрузка команд…</Text>
          </View>
        ) : !selectedTeamId && !error ? (
          <Text style={styles.muted}>Выберите команду — здесь появится краткий фокус перед стартом.</Text>
        ) : planningLoading || planningAwaitingFirstPaint ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.muted}>Собираем фокус…</Text>
          </View>
        ) : planningError ? (
          <Text style={styles.error}>{planningError}</Text>
        ) : !planningHasBody ? (
          <Text style={styles.muted}>
            После нескольких подтверждённых тренировок и задач из live training здесь появятся фокусы на
            следующее занятие.
          </Text>
        ) : (
          <View style={styles.planningBlock}>
            {planning!.lowData && (
              <Text style={styles.planningHint}>
                Пока нет материализованных follow-up; вывод частично по подтверждённым live-сессиям.
              </Text>
            )}
            {planning!.summaryLines.map((line, i) => (
              <Text key={`s-${i}`} style={styles.planningSummaryLine}>
                {line}
              </Text>
            ))}
            {planning!.focusPlayers.length > 0 ? (
              <View style={styles.planningSection}>
                <Text style={styles.planningSectionTitle}>Игроки</Text>
                {planning!.focusPlayers.map((p) => (
                  <View key={p.playerId} style={styles.planningRow}>
                    <View style={styles.planningRowHead}>
                      <Text style={styles.planningName}>{p.playerName}</Text>
                      <Text style={styles.planningPill}>{priorityLabelRu(p.priority)}</Text>
                    </View>
                    {p.reasons[0] ? <Text style={styles.planningDetail}>{p.reasons[0]}</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}
            {planning!.focusDomains.length > 0 ? (
              <View style={styles.planningSection}>
                <Text style={styles.planningSectionTitle}>Темы внимания</Text>
                {planning!.focusDomains.map((d) => (
                  <View key={d.domain} style={styles.planningRow}>
                    <Text style={styles.planningName}>{d.labelRu}</Text>
                    <Text style={styles.planningDetail}>{d.reason}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {planning!.reinforceAreas.length > 0 ? (
              <View style={styles.planningSection}>
                <Text style={styles.planningSectionTitle}>Закрепить</Text>
                {planning!.reinforceAreas.map((r) => (
                  <View key={r.domain} style={styles.planningRow}>
                    <Text style={styles.planningName}>{r.labelRu}</Text>
                    <Text style={styles.planningDetail}>{r.reason}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </SectionCard>
      </Reanimated.View>

      {planning &&
      hasStartPrioritiesBody(planning.startPriorities) &&
      selectedTeamId &&
      !(planningLoading || planningAwaitingFirstPaint || planningError) ? (
        <Reanimated.View entering={entryAfterHero(7)}>
        <SectionCard
          elevated
          style={{
            ...styles.card,
            ...styles.startPrioritiesCard,
            ...(planning.startPriorities!.lowData ? styles.startPrioritiesCardLowData : null),
          }}
        >
          <Text style={styles.kicker}>Главный фокус старта</Text>
          {planning.startPriorities!.summaryLine ? (
            <Text
              style={
                isStartPrioritiesCompact(planning.startPriorities!)
                  ? styles.startPrioritiesSummaryCompact
                  : styles.startPrioritiesSummary
              }
            >
              {planning.startPriorities!.summaryLine}
            </Text>
          ) : null}
          {!isStartPrioritiesCompact(planning.startPriorities!) &&
          planning.startPriorities!.primaryPlayers.length > 0 ? (
            <View style={styles.startPrioritiesSection}>
              <Text style={styles.startPrioritiesSectionTitle}>В первую очередь — игроки</Text>
              {planning.startPriorities!.primaryPlayers.map((p) => (
                <View key={p.playerId} style={styles.startPrioritiesRow}>
                  <View style={styles.startPrioritiesRowHead}>
                    <Text style={styles.startPrioritiesName}>{p.playerName}</Text>
                    <Text style={styles.startPrioritiesPill}>
                      {carryForwardPlayerSourceLabelRu(p.source)}
                    </Text>
                  </View>
                  <Text style={styles.startPrioritiesDetail}>{p.reason}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {isStartPrioritiesCompact(planning.startPriorities!) &&
          planning.startPriorities!.primaryPlayers.length === 1 &&
          planning.startPriorities!.primaryDomains.length === 0 ? (
            <View style={styles.startPrioritiesRow}>
              <View style={styles.startPrioritiesRowHead}>
                <Text style={styles.startPrioritiesName}>
                  {planning.startPriorities!.primaryPlayers[0].playerName}
                </Text>
                <Text style={styles.startPrioritiesPill}>
                  {carryForwardPlayerSourceLabelRu(planning.startPriorities!.primaryPlayers[0].source)}
                </Text>
              </View>
              <Text style={styles.startPrioritiesDetail}>
                {planning.startPriorities!.primaryPlayers[0].reason}
              </Text>
            </View>
          ) : null}
          {isStartPrioritiesCompact(planning.startPriorities!) &&
          planning.startPriorities!.primaryPlayers.length === 0 &&
          planning.startPriorities!.primaryDomains.length === 1 ? (
            <View style={styles.startPrioritiesRow}>
              <View style={styles.startPrioritiesRowHead}>
                <Text style={styles.startPrioritiesName}>
                  {planning.startPriorities!.primaryDomains[0].labelRu}
                </Text>
                <Text style={styles.startPrioritiesPill}>
                  {carryForwardDomainSourceLabelRu(planning.startPriorities!.primaryDomains[0].source)}
                </Text>
              </View>
              <Text style={styles.startPrioritiesDetail}>
                {planning.startPriorities!.primaryDomains[0].reason}
              </Text>
            </View>
          ) : null}
          {!isStartPrioritiesCompact(planning.startPriorities!) &&
          planning.startPriorities!.primaryDomains.length > 0 ? (
            <View style={styles.startPrioritiesSection}>
              <Text style={styles.startPrioritiesSectionTitle}>Ключевые темы</Text>
              {planning.startPriorities!.primaryDomains.map((d) => (
                <View key={d.domain} style={styles.startPrioritiesRow}>
                  <View style={styles.startPrioritiesRowHead}>
                    <Text style={styles.startPrioritiesName}>{d.labelRu}</Text>
                    <Text style={styles.startPrioritiesPill}>
                      {carryForwardDomainSourceLabelRu(d.source)}
                    </Text>
                  </View>
                  <Text style={styles.startPrioritiesDetail}>{d.reason}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {!isStartPrioritiesCompact(planning.startPriorities!) &&
          planning.startPriorities!.secondaryItems.length > 0 ? (
            <View style={styles.startPrioritiesSection}>
              <Text style={styles.startPrioritiesSectionTitle}>Вторичный перенос</Text>
              {planning.startPriorities!.secondaryItems.map((line, i) => (
                <Text key={`sec-${i}`} style={styles.startPrioritiesBullet}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
          {!isStartPrioritiesCompact(planning.startPriorities!) &&
          planning.startPriorities!.reinforcementItems.length > 0 ? (
            <View style={styles.startPrioritiesSection}>
              <Text style={styles.startPrioritiesSectionTitle}>Закрепление</Text>
              {planning.startPriorities!.reinforcementItems.map((line, i) => (
                <Text key={`re-${i}`} style={styles.startPrioritiesBullet}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
          {isStartPrioritiesCompact(planning.startPriorities!) &&
          planning.startPriorities!.reinforcementItems.length > 0 ? (
            <View style={styles.startPrioritiesSection}>
              <Text style={styles.startPrioritiesSectionTitleMuted}>Закрепление</Text>
              {planning.startPriorities!.reinforcementItems.map((line, i) => (
                <Text key={`rec-${i}`} style={styles.startPrioritiesBulletMuted}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </SectionCard>
        </Reanimated.View>
      ) : null}

      {planning?.carryForward &&
      selectedTeamId &&
      !(planningLoading || planningAwaitingFirstPaint || planningError) ? (
        <Reanimated.View entering={entryAfterHero(8)}>
        <SectionCard elevated style={{ ...styles.card, ...styles.carryForwardCard }}>
          <Text style={styles.kicker}>Что несём в эту тренировку</Text>
          {planning.carryForward.lowData ? (
            <Text style={styles.carryForwardHint}>
              Слой неполный: опора на последнюю сессию или задачи без полного набора follow-up.
            </Text>
          ) : null}
          {planning.carryForward.carryForwardSummary.map((line, i) => (
            <Text key={`cf-s-${i}`} style={styles.carryForwardSummaryLine}>
              {line}
            </Text>
          ))}
          {planning.carryForward.focusPlayers.length > 0 ? (
            <View style={styles.carryForwardSection}>
              <Text style={styles.carryForwardSectionTitle}>Игроки</Text>
              {planning.carryForward.focusPlayers.map((p) => (
                <View key={p.playerId} style={styles.carryForwardRow}>
                  <View style={styles.carryForwardRowHead}>
                    <Text style={styles.carryForwardName}>{p.playerName}</Text>
                    <Text style={styles.carryForwardSourcePill}>{carryForwardPlayerSourceLabelRu(p.source)}</Text>
                  </View>
                  <Text style={styles.carryForwardDetail}>{p.reason}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {planning.carryForward.focusDomains.length > 0 ? (
            <View style={styles.carryForwardSection}>
              <Text style={styles.carryForwardSectionTitle}>Темы</Text>
              {planning.carryForward.focusDomains.map((d) => (
                <View key={d.domain} style={styles.carryForwardRow}>
                  <View style={styles.carryForwardRowHead}>
                    <Text style={styles.carryForwardName}>{d.labelRu}</Text>
                    <Text style={styles.carryForwardSourcePill}>{carryForwardDomainSourceLabelRu(d.source)}</Text>
                  </View>
                  <Text style={styles.carryForwardDetail}>{d.reason}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {planning.carryForward.reinforceAreas.length > 0 ? (
            <View style={styles.carryForwardSection}>
              <Text style={styles.carryForwardSectionTitle}>Закрепляем</Text>
              {planning.carryForward.reinforceAreas.map((r) => (
                <View key={r.domain} style={styles.carryForwardRow}>
                  <View style={styles.carryForwardRowHead}>
                    <Text style={styles.carryForwardName}>{r.labelRu}</Text>
                    <Text style={styles.carryForwardSourcePill}>
                      {r.source === "follow_up"
                        ? "follow-up"
                        : r.source === "continuity_lock_in"
                          ? "зафиксировано"
                          : r.source === "unresolved_priority_carry_forward"
                            ? "прошлый старт"
                            : "фокус"}
                    </Text>
                  </View>
                  <Text style={styles.carryForwardDetail}>{r.reason}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </SectionCard>
        </Reanimated.View>
      ) : null}

      {planning &&
      planning.planSeeds.blocks.length > 0 &&
      !(planningLoading || planningAwaitingFirstPaint || planningError) ? (
        <Reanimated.View entering={entryAfterHero(9)}>
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Черновик структуры тренировки</Text>
          {planning.planSeeds.lowData ? (
            <Text style={styles.seedsHint}>Общий ориентир — мало данных для детальных блоков.</Text>
          ) : (
            <Text style={styles.seedsHint}>
              {planning.carryForward
                ? "Заготовки блоков с учётом прошлого занятия — ориентир перед стартом."
                : "Заготовки блоков без редактирования — ориентир перед стартом."}
            </Text>
          )}
          <View style={styles.seedsList}>
            {planning.planSeeds.blocks.map((b, idx) => (
              <View
                key={`${b.type}-${idx}`}
                style={[styles.seedRow, idx > 0 && styles.seedRowBorder]}
              >
                <Text style={styles.seedTitle}>{b.title}</Text>
                <Text style={styles.seedDesc}>{b.description}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
        </Reanimated.View>
      ) : null}

      {ltPlayerId ? (
        <Reanimated.View entering={entryAfterHero(10)}>
        <SectionCard elevated style={styles.card}>
          <Text style={styles.kicker}>Подсказки из отчётов</Text>
          {reportSuggLoading ? (
            <View style={styles.centerRow}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={styles.muted}>Подгружаем ориентиры по игроку…</Text>
            </View>
          ) : reportSuggestionsTeamMismatch ? (
            <Text style={styles.muted}>
              Игрок из ссылки относится к другой команде — выберите его команду выше или начните без
              подмешивания отчётов.
            </Text>
          ) : !reportAnalyticsForStart?.taskSuggestions?.suggestions?.length ? (
            <Text style={styles.muted}>Пока нет подсказок из сохранённых отчётов для этого игрока.</Text>
          ) : (
            <View style={styles.reportSuggRow}>
              <View style={styles.reportSuggTextCol}>
                <Text style={styles.reportSuggLine}>
                  Добавить в снимок плана пару коротких ориентиров из CRM (без создания задач).
                </Text>
              </View>
              <Switch
                value={useReportSuggestions && !reportSuggestionsTeamMismatch}
                onValueChange={setUseReportSuggestions}
                disabled={reportSuggestionsTeamMismatch}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primaryMuted }}
                thumbColor={theme.colors.text}
              />
            </View>
          )}
        </SectionCard>
        </Reanimated.View>
      ) : null}

      <Reanimated.View entering={entryAfterHero(11)}>
      <PrimaryButton
        title={starting ? "Запуск…" : "Начать тренировку"}
        onPress={() => void onStart()}
        disabled={starting || loading || !!error || teams.length === 0 || !selectedTeamId}
        animatedPress
        style={styles.cta}
      />
      </Reanimated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.layout.screenBottom + theme.spacing.xl,
  },
  lead: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.layout.sectionGap,
  },
  onboardingCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  onboardingLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  reportSuggRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  reportSuggTextCol: {
    flex: 1,
    minWidth: 0,
  },
  reportSuggLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
  teamList: {
    marginTop: theme.spacing.xs,
  },
  teamRowAnimWrap: {
    alignSelf: "stretch",
  },
  teamRow: {
    paddingVertical: theme.spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  teamRowSelected: {
    backgroundColor: theme.colors.primaryMuted,
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  teamName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    flex: 1,
  },
  teamNameSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  teamMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  modeChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  modeChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted,
  },
  modeChipText: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
  },
  modeChipTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  cta: {
    marginTop: theme.spacing.md,
  },
  closedLoopWrap: {
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.cardBorder,
    borderRightColor: theme.colors.cardBorder,
    borderBottomColor: theme.colors.cardBorder,
  },
  closedLoopTitle: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  closedLoopBlockTitle: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: 11,
  },
  closedLoopBlockTitleFirst: {
    marginTop: theme.spacing.xs,
  },
  closedLoopBullet: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  closedLoopLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  closedLoopThemes: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
  },
  closedLoopPlayerRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  closedLoopPlayerName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  closedLoopPlayerNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  closedLoopDeferred: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    lineHeight: 18,
    marginBottom: 4,
  },
  closedLoopFoot: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    fontStyle: "italic",
  },
  planningBlock: {
    gap: theme.spacing.md,
  },
  planningHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  planningSummaryLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  planningSection: {
    marginTop: theme.spacing.xs,
  },
  planningSectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  planningRow: {
    marginBottom: theme.spacing.sm,
  },
  planningRowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  planningName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  planningPill: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  planningDetail: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  seedsHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  seedsList: {
    marginTop: theme.spacing.xs,
  },
  seedRow: {
    paddingVertical: theme.spacing.sm,
  },
  seedRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  seedTitle: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  seedDesc: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  cycleContextCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(59, 130, 246, 0.22)",
    opacity: 0.99,
  },
  cycleContextKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    fontSize: 11,
  },
  cycleContextMeta: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  cycleContextBlock: {
    marginBottom: theme.spacing.sm,
  },
  cycleContextBlockTitle: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  cycleContextLine: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
    marginBottom: 3,
  },
  cycleContextNote: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    marginTop: theme.spacing.xs,
  },
  prevCycleSeedCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(120, 120, 128, 0.35)",
    opacity: 0.98,
  },
  prevCycleSeedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  prevCycleSeedTitleCol: {
    flex: 1,
    paddingRight: theme.spacing.xs,
  },
  prevCycleSeedKicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    fontSize: 11,
  },
  prevCycleSeedSub: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textMuted,
  },
  prevCycleSeedLine: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  prevCycleSeedFoot: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    marginTop: theme.spacing.sm,
  },
  carryForwardCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primaryMuted,
  },
  carryForwardHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  carryForwardSummaryLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  carryForwardSection: {
    marginTop: theme.spacing.sm,
  },
  carryForwardSectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  carryForwardRow: {
    marginBottom: theme.spacing.sm,
  },
  carryForwardRowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  carryForwardName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  carryForwardSourcePill: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  carryForwardDetail: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  startPrioritiesCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  startPrioritiesCardLowData: {
    borderLeftColor: theme.colors.border,
  },
  startPrioritiesSummary: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  startPrioritiesSummaryCompact: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 21,
    marginBottom: theme.spacing.xs,
  },
  startPrioritiesSection: {
    marginTop: theme.spacing.sm,
  },
  startPrioritiesSectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  startPrioritiesSectionTitleMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    marginBottom: 4,
  },
  startPrioritiesRow: {
    marginBottom: theme.spacing.sm,
  },
  startPrioritiesRowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  startPrioritiesName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  startPrioritiesPill: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  startPrioritiesDetail: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  startPrioritiesBullet: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 4,
    lineHeight: 20,
  },
  startPrioritiesBulletMuted: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
    lineHeight: 19,
  },
});

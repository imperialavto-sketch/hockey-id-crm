/** PHASE 3: `COACH_CANONICAL_LIVE_FLOW` (`docs/PHASE_3_APP_FLOW_LOCK.md`). */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Reanimated from "react-native-reanimated";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { screenReveal } from "@/lib/animations";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import { ApiRequestError } from "@/lib/api";
import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import {
  buildLiveTrainingCoachPostSessionSummary,
  type LiveTrainingCoachPostSessionSummary,
} from "@/lib/liveTrainingCoachSummaryViewModel";
import {
  buildLiveTrainingCoachTruthSummary,
  type LiveTrainingCoachTruthSummary,
} from "@/lib/liveTrainingCoachTruthViewModel";
import { FinalizeReportCarryForwardSection } from "@/components/live-training/FinalizeReportCarryForwardSection";
import { buildLiveTrainingFinalizeCarryForwardVm } from "@/lib/liveTrainingFinalizeCarryForwardViewModel";
import {
  buildLiveTrainingNextTrainingHandoff,
  liveTrainingNextHandoffHasContent,
  type LiveTrainingNextTrainingHandoff,
} from "@/lib/liveTrainingNextTrainingHandoffViewModel";
import {
  buildLiveTrainingCoachWrapUp,
  type LiveTrainingCoachWrapUp,
} from "@/lib/liveTrainingCoachWrapUp";
import { formatLiveTrainingMode } from "@/lib/liveTrainingUi";
import {
  ruGroupSessionContextConsistencyLabel,
  ruGroupSessionContextCoverageLabel,
} from "@/lib/liveTrainingSessionGroupContextUiLabels";
import {
  fetchLiveTrainingSessionActionCandidates,
  materializeLiveTrainingSessionActionCandidate,
  getLiveTrainingSession,
  LIVE_TRAINING_START_ROUTE,
  type LiveTrainingActionCandidate,
} from "@/services/liveTrainingService";
import type {
  LiveTrainingPriorityAlignmentReview,
  LiveTrainingQualityFrame,
  LiveTrainingSession,
  LiveTrainingSessionGroupContextSignalRollup,
  LiveTrainingSessionGroupContextStampDiagnostic,
  LiveTrainingSessionOutcome,
} from "@/types/liveTraining";

/**
 * Вторичный read-only блок: атрибуция контекста группы на уровне сессии (не team PvO, не строгая истина).
 * Показывается только при подтверждённой сессии и наличии обоих DTO с GET session.
 */
function SessionGroupContextAttributionBlock({
  rollup,
  diagnostic,
}: {
  rollup: LiveTrainingSessionGroupContextSignalRollup;
  diagnostic: LiveTrainingSessionGroupContextStampDiagnostic;
}) {
  const canonical = rollup.canonicalGroupId?.trim() ?? "";
  const groupLine =
    canonical.length === 0 ? "Без группы" : `Группа сессии: ${canonical}`;
  const coverageLine = ruGroupSessionContextCoverageLabel(rollup.coverageKind);
  const consistencyLine = ruGroupSessionContextConsistencyLabel(diagnostic.consistencyKind);
  const ids = diagnostic.distinctStampedGroupIds;
  const showStampDetail =
    ids.length > 0 &&
    (ids.length <= 2 ||
      diagnostic.consistencyKind === "mixed_stamps" ||
      diagnostic.consistencyKind === "mismatch");
  const stampIdsText = showStampDetail
    ? ids.length <= 2
      ? ids.join(", ")
      : `${ids.slice(0, 2).join(", ")} (+${ids.length - 2})`
    : null;

  return (
    <View style={styles.groupCtxShell}>
      <Text style={styles.groupCtxKicker}>Контекст группы сессии</Text>
      <Text style={styles.groupCtxLineMuted}>{groupLine}</Text>
      <Text style={styles.groupCtxLabel}>Покрытие атрибуции сигналов</Text>
      <Text style={styles.groupCtxValue}>{coverageLine}</Text>
      <Text style={styles.groupCtxLineMuted}>
        С атрибуцией: {rollup.attributedSignalCount} · Legacy: {rollup.legacySignalCount}
      </Text>
      <Text style={styles.groupCtxLabel}>Согласованность контекста</Text>
      <Text style={styles.groupCtxValue}>{consistencyLine}</Text>
      {diagnostic.stampedNullPresent ? (
        <Text style={styles.groupCtxLineMuted}>
          Есть сигналы с пустым идентификатором группы в метаданных атрибуции.
        </Text>
      ) : null}
      {stampIdsText ? (
        <Text style={styles.groupCtxMono} numberOfLines={3} ellipsizeMode="tail">
          ID в штампах: {stampIdsText}
        </Text>
      ) : null}
      {diagnostic.consistencyNote ? (
        <Text style={styles.groupCtxNote} numberOfLines={2} ellipsizeMode="tail">
          {diagnostic.consistencyNote}
        </Text>
      ) : null}
    </View>
  );
}

/** Маленький честный слой «итог обработки» — дополняет дайджест, не заменяет review. */
function CoachTruthLayerSection({ truth }: { truth: LiveTrainingCoachTruthSummary }) {
  return (
    <GlassCardV2 padding="lg" style={styles.truthGlass}>
      <Text style={styles.truthKicker}>Что вошло в систему</Text>
      <Text style={styles.truthLine}>
        В игроков (сигналы): <Text style={styles.truthEm}>{truth.playerSignalsCreated}</Text>
      </Text>
      <Text style={styles.truthLineMuted}>
        Наблюдений по игрокам: {truth.playerObservationsIncluded}
        {truth.playerObservationUnlinkedCount > 0
          ? ` · без карточки: ${truth.playerObservationUnlinkedCount}`
          : ""}
      </Text>
      <Text style={styles.truthLine}>
        На уровне команды: <Text style={styles.truthEm}>{truth.teamObservationsIncluded}</Text>
      </Text>
      <Text style={styles.truthLine}>
        Общий итог тренировки: <Text style={styles.truthEm}>{truth.sessionObservationsIncluded}</Text>
      </Text>
      <Text style={styles.truthLine}>
        Проверить вручную: <Text style={styles.truthEm}>{truth.needsManualAttentionCount}</Text>
      </Text>
      {truth.totalActionCandidates > 0 ? (
        <Text style={styles.truthLineMuted}>
          Подсказки-действия: в работе {truth.materializedActionCount} · можно добавить{" "}
          {truth.pendingActionCount}
        </Text>
      ) : null}
      {truth.excludedObservationsCount > 0 ? (
        <Text style={styles.truthLineMuted}>
          Исключено из подтверждения: {truth.excludedObservationsCount}
        </Text>
      ) : null}
      {truth.coachHints.map((h, i) => (
        <Text key={i} style={styles.truthHint}>
          {h}
        </Text>
      ))}
    </GlassCardV2>
  );
}

/** Компактный coach-first дайджест: внимание / плюсы / темы / перенос / подсказки (без дублирования review-ленты). */
function PostSessionCoachDigestSection({
  summary,
  outcome,
  onOpenPlayer,
}: {
  summary: LiveTrainingCoachPostSessionSummary;
  outcome: LiveTrainingSessionOutcome;
  onOpenPlayer: (playerId: string) => void;
}) {
  const mixLine = `Наблюдений: ${summary.totalObservations} · игрок ${summary.playerObservationCount} · пятёрка ${summary.teamObservationCount} · сессия ${summary.sessionObservationCount}`;
  return (
    <GlassCardV2 padding="lg" contentStyle={styles.digestGlassAccent} style={styles.digestGlass}>
      <Text style={styles.digestKicker}>Кратко для тренера</Text>
      <Text style={styles.digestMix}>{mixLine}</Text>
      {summary.needsReviewCount > 0 ? (
        <Text style={styles.digestReviewHint}>
          На проверке в черновиках: {summary.needsReviewCount}
        </Text>
      ) : null}

      <Text style={styles.digestBlockTitle}>Кому внимание</Text>
      {summary.playersNeedingAttention.length > 0 ? (
        summary.playersNeedingAttention.map((p) => (
          <Pressable
            key={p.playerId}
            onPress={() => onOpenPlayer(p.playerId)}
            style={({ pressed }) => [styles.digestRow, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.digestName}>{p.playerName}</Text>
            <Text style={styles.digestReason}>{p.reason}</Text>
          </Pressable>
        ))
      ) : outcome.negativeSignalsCount > 0 ? (
        <Text style={styles.digestMuted}>
          Есть сигналы «на внимание» ({outcome.negativeSignalsCount}) — см. список игроков ниже.
        </Text>
      ) : (
        <Text style={styles.digestMuted}>Явных минусов по сигналам нет.</Text>
      )}

      <Text style={styles.digestBlockTitle}>Что получилось</Text>
      {summary.playersPositive.length > 0 ? (
        summary.playersPositive.map((p) => (
          <Pressable
            key={p.playerId}
            onPress={() => onOpenPlayer(p.playerId)}
            style={({ pressed }) => [styles.digestRow, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.digestName}>{p.playerName}</Text>
            <Text style={styles.digestReason}>{p.reason}</Text>
          </Pressable>
        ))
      ) : outcome.positiveSignalsCount > 0 ? (
        <Text style={styles.digestMuted}>
          Плюсы зафиксированы ({outcome.positiveSignalsCount}) — детали у игроков ниже.
        </Text>
      ) : (
        <Text style={styles.digestMuted}>Персональных плюсов в сигналах мало или их не было.</Text>
      )}

      <Text style={styles.digestBlockTitle}>Главные темы</Text>
      {summary.topThemes.length > 0 ? (
        <Text style={styles.digestThemes}>{summary.topThemes.join(" · ")}</Text>
      ) : (
        <Text style={styles.digestMuted}>Темы по метрикам не выделились — см. общий итог.</Text>
      )}

      <Text style={styles.digestBlockTitle}>Унести дальше</Text>
      {summary.carryForwardFocus.length > 0 ? (
        summary.carryForwardFocus.map((line, i) => (
          <Text key={i} style={styles.digestCarryLine}>
            • {line}
          </Text>
        ))
      ) : (
        <Text style={styles.digestMuted}>Перенос из lock-in не задан — можно опереться на задачи ниже.</Text>
      )}

      {summary.suggestedActions.length > 0 ? (
        <>
          <Text style={styles.digestBlockTitle}>Ориентиры действий</Text>
          {summary.suggestedActions.map((a, i) => (
            <View key={i} style={styles.digestActionRow}>
              <Text style={styles.digestActionTitle}>{a.title}</Text>
              {a.subtitle ? <Text style={styles.digestActionSub}>{a.subtitle}</Text> : null}
            </View>
          ))}
          <Text style={styles.digestActionFoot}>
            Персональные шаги можно сразу добавить в работу в блоке ниже.
          </Text>
        </>
      ) : null}
    </GlassCardV2>
  );
}

/** Мост к следующему старту: перенос, пятёрка/сессия, игроки, темы, действия сейчас (без LLM). */
function NextTrainingHandoffSection({
  handoff,
  onOpenPlayer,
}: {
  handoff: LiveTrainingNextTrainingHandoff;
  onOpenPlayer: (playerId: string) => void;
}) {
  const has = liveTrainingNextHandoffHasContent(handoff);
  return (
    <GlassCardV2 padding="lg" contentStyle={styles.handoffGlassAccent} style={styles.handoffGlass}>
      <Text style={styles.handoffTitle}>Следующая тренировка</Text>
      {!has ? (
        <Text style={styles.handoffMuted}>
          Мало данных для автопереноса — задай фокус из плана команды.
        </Text>
      ) : null}

      {has ? (
        <>
          <Text style={styles.handoffBlockTitle}>На следующую тренировку</Text>
          {handoff.nextTrainingFocus.length > 0 ? (
            handoff.nextTrainingFocus.map((line, i) => (
              <Text key={i} style={styles.handoffBullet}>
                • {line}
              </Text>
            ))
          ) : (
            <Text style={styles.handoffMuted}>
              Lock-in пуст — опирайся на темы по игрокам и блок действий ниже.
            </Text>
          )}

          <Text style={styles.handoffBlockTitle}>Пятёрка и сессия</Text>
          {handoff.teamAndSessionFocus.map((line, i) => (
            <Text key={i} style={styles.handoffLine}>
              {line}
            </Text>
          ))}

          <Text style={styles.handoffBlockTitle}>Игроки в фокусе</Text>
          {handoff.playersForIndividualAccent.length > 0 ? (
            handoff.playersForIndividualAccent.map((p) => (
              <Pressable
                key={p.playerId}
                onPress={() => onOpenPlayer(p.playerId)}
                style={({ pressed }) => [styles.handoffPlayerRow, pressed && { opacity: 0.88 }]}
              >
                <Text style={styles.handoffPlayerName}>{p.displayName}</Text>
                <Text style={styles.handoffPlayerNote}>{p.note}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.handoffMuted}>
              В переносе нет имен — в этой сессии акцент мог быть на пятёрке или общем итоге.
            </Text>
          )}

          <Text style={styles.handoffBlockTitle}>Темы по игрокам (сигналы)</Text>
          {handoff.playerThematicFocus.length > 0 ? (
            <Text style={styles.handoffThemes}>{handoff.playerThematicFocus.join(" · ")}</Text>
          ) : (
            <Text style={styles.handoffMuted}>Ярких тем по метрикам нет — задай фокус вручную.</Text>
          )}

          <Text style={styles.handoffBlockTitle}>Что можно сделать сейчас</Text>
          {handoff.suggestedImmediateActions.length > 0 ? (
            handoff.suggestedImmediateActions.map((a, i) => (
              <View key={i} style={styles.handoffActionRow}>
                <Text style={styles.handoffActionScope}>
                  {a.scope === "team" ? "Команда" : "Игрок"}
                </Text>
                <Text style={styles.handoffActionTitle}>{a.title}</Text>
                {a.subtitle ? <Text style={styles.handoffActionSub}>{a.subtitle}</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.handoffMuted}>
              Подсказок пока нет — вернись к карточкам игроков или к плану следующей тренировки.
            </Text>
          )}

          {handoff.deferredOrReviewItems.length > 0 ? (
            <>
              <Text style={styles.handoffBlockTitle}>Сначала / отложить</Text>
              {handoff.deferredOrReviewItems.map((line, i) => (
                <Text key={i} style={styles.handoffDeferred}>
                  {line}
                </Text>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </GlassCardV2>
  );
}

function continuitySummaryDirectionsWordRu(n: number): string {
  const k = Math.abs(n) % 100;
  const j = k % 10;
  if (k >= 11 && k <= 14) return "направлений";
  if (j === 1) return "направление";
  if (j >= 2 && j <= 4) return "направления";
  return "направлений";
}

function ContinuityToNextCycleSection({
  lines,
  moreSummaryDirectionsCount = 0,
}: {
  lines: string[];
  moreSummaryDirectionsCount?: number;
}) {
  if (lines.length === 0) return null;
  return (
    <GlassCardV2 padding="lg" contentStyle={styles.continuityNextAccent} style={styles.continuityNextGlass}>
      <Text style={styles.continuityNextKicker}>Ключевой фокус следующей тренировки</Text>
      {lines.map((line, i) => (
        <Text key={i} style={styles.continuityNextLine}>
          {line}
        </Text>
      ))}
      {moreSummaryDirectionsCount > 0 ? (
        <Text style={styles.continuityNextMoreHint}>
          Ещё {moreSummaryDirectionsCount}{" "}
          {continuitySummaryDirectionsWordRu(moreSummaryDirectionsCount)}
        </Text>
      ) : null}
    </GlassCardV2>
  );
}

/** PHASE 44.1: нет числового разбора — не показываем балл как успех. skippedNoTargets главнее устаревшего band. */
function isSkippedPriorityAlignment(review: LiveTrainingPriorityAlignmentReview): boolean {
  if (review.skippedNoTargets) return true;
  if (review.alignmentBand === "not_applicable") return true;
  if (review.evaluationApplied === false) return true;
  return false;
}

function uncoveredPrioritySummary(review: LiveTrainingPriorityAlignmentReview): string | null {
  const idToName = new Map(review.playerCoverage.map((p) => [p.playerId, p.playerName]));
  const playerBits = review.uncoveredPlayers
    .map((id) => {
      const n = idToName.get(id);
      if (!n) return null;
      const short = n.trim().split(/\s+/)[0] || n;
      return short;
    })
    .filter((x): x is string => Boolean(x));
  const domainBits = review.uncoveredDomains.map((d) => formatLiveTrainingMetricDomain(d));
  const reinfBits = review.uncoveredReinforcement.map((d) => formatLiveTrainingMetricDomain(d));
  const parts: string[] = [];
  if (playerBits.length) {
    parts.push(
      `игроки: ${playerBits.slice(0, 3).join(", ")}${playerBits.length > 3 ? "…" : ""}`
    );
  }
  if (domainBits.length) {
    parts.push(
      `темы: ${domainBits.slice(0, 2).join(", ")}${domainBits.length > 2 ? "…" : ""}`
    );
  }
  if (reinfBits.length) {
    parts.push(
      `закрепление: ${reinfBits.slice(0, 2).join(", ")}${reinfBits.length > 2 ? "…" : ""}`
    );
  }
  if (parts.length === 0) return null;
  return `Без сигнала по: ${parts.join(" · ")}`;
}

/** PHASE 44 / 44.1: компактный блок из continuity (только экран завершения). */
function PriorityAlignmentReviewSection({ review }: { review: LiveTrainingPriorityAlignmentReview }) {
  if (isSkippedPriorityAlignment(review)) {
    const line =
      review.explanation[0] ??
      "Для этой тренировки приоритеты старта не заданы — сравнение с планом не выполнялось.";
    return (
      <GlassCardV2 padding="lg" contentStyle={styles.priorityNeutralAccent} style={styles.priorityGlass}>
        <Text style={styles.kicker}>Приоритеты старта</Text>
        <Text style={styles.priorityNeutralLine}>{line}</Text>
      </GlassCardV2>
    );
  }

  const bandRu =
    review.alignmentBand === "strong"
      ? "Сильное соответствие"
      : review.alignmentBand === "partial"
        ? "Частичное соответствие"
        : "Слабое соответствие";

  const uncoveredLine = uncoveredPrioritySummary(review);
  const detailLines = review.explanation.filter(Boolean).slice(0, 2);

  return (
    <GlassCardV2 padding="lg" contentStyle={styles.priorityAlignedAccent} style={styles.priorityGlass}>
      <Text style={styles.kicker}>Приоритеты старта</Text>
      <Text style={styles.statLine}>
        {bandRu}
        <Text style={styles.statEm}> · {Math.round(review.alignmentScore * 100)}%</Text>
      </Text>
      {detailLines.map((line, i) => (
        <Text key={i} style={styles.priorityDetailMuted}>
          {line}
        </Text>
      ))}
      {uncoveredLine ? (
        <Text style={styles.priorityUncoveredMuted}>{uncoveredLine}</Text>
      ) : null}
    </GlassCardV2>
  );
}

/** PHASE 48: верхнеуровневая сводка (не дублирует детальный блок приоритетов). */
function TrainingQualityFrameSection({ frame }: { frame: LiveTrainingQualityFrame }) {
  if (frame.qualityBand == null) return null;
  const headline =
    frame.qualityBand === "stable"
      ? "Качество закрытия старта"
      : frame.qualityBand === "watch"
        ? "Качество старта — на контроле"
        : "Качество старта — упор на догон";
  const borderLeftColor =
    frame.qualityBand === "stable"
      ? theme.colors.primary
      : frame.qualityBand === "watch"
        ? theme.colors.warning
        : theme.colors.textMuted;
  let planningHint: string | null = null;
  if (frame.executionPressureMode === "tighten") {
    planningHint =
      "Следующее планирование может быть плотнее — по недавней истории накопилось давление.";
  } else if (frame.executionPressureMode === "watch") {
    planningHint = "Следующий старт: чуть больше внимания к переносам и фокусу.";
  }
  return (
    <GlassCardV2
      padding="lg"
      style={styles.qualityFrameGlass}
      contentStyle={[styles.qualityFrameAccent, { borderLeftColor }]}
    >
      <Text style={styles.kicker}>{headline}</Text>
      {frame.explanation.slice(0, 2).map((line, i) => (
        <Text key={i} style={styles.qualityFrameLine}>
          {line}
        </Text>
      ))}
      {planningHint ? <Text style={styles.qualityFrameHint}>{planningHint}</Text> : null}
    </GlassCardV2>
  );
}

function CoachWrapUpSection({ wrapUp }: { wrapUp: LiveTrainingCoachWrapUp }) {
  const borderLeftColor =
    wrapUp.tone === "positive"
      ? theme.colors.primary
      : wrapUp.tone === "attention"
        ? theme.colors.warning
        : theme.colors.textMuted;

  return (
    <GlassCardV2
      padding="lg"
      style={styles.coachWrapUpGlass}
      contentStyle={[styles.coachWrapUpAccent, { borderLeftColor }]}
    >
      <Text style={styles.coachWrapUpKicker}>Итог для тренера</Text>
      <Text style={styles.coachWrapUpHeadline}>{wrapUp.headline}</Text>
      {wrapUp.lines.map((line, i) => (
        <Text key={i} style={styles.coachWrapUpLine}>
          {line}
        </Text>
      ))}
      {wrapUp.nextFocusLine ? (
        <Text style={styles.coachWrapUpNext}>{wrapUp.nextFocusLine}</Text>
      ) : null}
    </GlassCardV2>
  );
}

function outcomeFromAnalytics(session: LiveTrainingSession): LiveTrainingSessionOutcome | null {
  const a = session.analyticsSummary;
  if (!a) return null;
  return {
    includedDraftsCount: 0,
    excludedDraftsCount: 0,
    draftsFlaggedNeedsReview: 0,
    manualAttentionDraftsCount: 0,
    playerObservationCount: 0,
    playerLinkedObservationCount: 0,
    playerObservationUnlinkedCount: 0,
    teamObservationCount: 0,
    sessionObservationCount: 0,
    signalsCreatedCount: a.signalCount,
    affectedPlayersCount: a.playersWithSignals,
    positiveSignalsCount: 0,
    negativeSignalsCount: 0,
    neutralSignalsCount: 0,
    topDomains: [],
    topPlayers: [],
  };
}

export default function LiveTrainingCompleteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const sid = typeof sessionId === "string" ? sessionId : sessionId?.[0];
  const mountedRef = useRef(true);
  const sidRef = useRef(sid);
  sidRef.current = sid;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [session, setSession] = useState<LiveTrainingSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionActionItems, setSessionActionItems] = useState<LiveTrainingActionCandidate[]>([]);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionActionLowData, setSessionActionLowData] = useState(true);
  const [sessionMaterializingCandidateId, setSessionMaterializingCandidateId] = useState<string | null>(
    null
  );

  const load = useCallback(async () => {
    if (!sid) return;
    const reqSid = sid;
    setLoading(true);
    setLoadError(null);
    try {
      const s = await getLiveTrainingSession(reqSid);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      setSession(s);
      if (!s) setLoadError("Сессия не найдена");
    } catch (e) {
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      setSession(null);
      setLoadError(
        e instanceof ApiRequestError
          ? e.message
          : "Не удалось загрузить сессию"
      );
    } finally {
      if (mountedRef.current && sidRef.current === reqSid) {
        setLoading(false);
      }
    }
  }, [sid]);

  useEffect(() => {
    void load();
  }, [load]);

  const ok = session?.status === "confirmed";

  const completeScheduleContextLine = useMemo(() => {
    if (!session) return null;
    const ctx = session.planningSnapshot?.scheduleSlotContext;
    if (!ctx) return null;
    const groupLine =
      ctx.groupId && ctx.groupName?.trim()
        ? ctx.groupName.trim()
        : "Вся команда";
    const tt = (ctx.trainingType ?? "").trim().toLowerCase();
    const typeRu =
      tt === "ofp"
        ? "ОФП"
        : tt === "ice"
          ? "Лёд"
          : tt === "mixed"
            ? "Смешанная"
            : formatLiveTrainingMode(session.mode);
    return `${groupLine} · ${typeRu}`;
  }, [session]);

  const outcome = useMemo(() => {
    if (!session || !ok) return null;
    return session.outcome ?? outcomeFromAnalytics(session);
  }, [session, ok]);

  const loadSessionActions = useCallback(async () => {
    if (!sid || !ok) {
      setSessionActionItems([]);
      setSessionActionLowData(true);
      setSessionActionLoading(false);
      return;
    }
    const reqSid = sid;
    setSessionActionLoading(true);
    try {
      const r = await fetchLiveTrainingSessionActionCandidates(reqSid);
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      setSessionActionItems(r.items);
      setSessionActionLowData(r.lowData);
    } catch {
      if (!mountedRef.current || sidRef.current !== reqSid) return;
      setSessionActionItems([]);
      setSessionActionLowData(true);
    } finally {
      if (mountedRef.current && sidRef.current === reqSid) {
        setSessionActionLoading(false);
      }
    }
  }, [sid, ok]);

  useEffect(() => {
    void loadSessionActions();
  }, [loadSessionActions]);

  const handleMaterializeSessionCandidate = useCallback(
    async (candidateId: string) => {
      if (!sid) return;
      const reqSid = sid;
      setSessionMaterializingCandidateId(candidateId);
      try {
        const r = await materializeLiveTrainingSessionActionCandidate(reqSid, candidateId);
        if (!mountedRef.current || sidRef.current !== reqSid) return;
        const msg = r.alreadyExists
          ? "Этот шаг уже был добавлен в созданные задачи."
          : "Задача добавлена в список созданных задач.";
        Alert.alert(r.alreadyExists ? "Уже в работе" : "Готово", msg);
        await loadSessionActions();
      } catch (err) {
        if (!mountedRef.current || sidRef.current !== reqSid) return;
        const msg =
          err instanceof ApiRequestError ? err.message : "Не удалось добавить задачу.";
        Alert.alert("Ошибка", msg);
      } finally {
        if (mountedRef.current) setSessionMaterializingCandidateId(null);
      }
    },
    [sid, loadSessionActions]
  );

  const topPlayers = outcome?.topPlayers ?? [];
  const hasRichOutcome = Boolean(session?.outcome);

  const coachWrapUp = useMemo((): LiveTrainingCoachWrapUp | null => {
    if (!ok || !outcome) return null;
    return buildLiveTrainingCoachWrapUp({
      outcome,
      hasRichOutcome,
      actionCandidateHints: sessionActionItems.slice(0, 4).map((it) => ({
        playerName: it.playerName,
        title: it.title,
      })),
    });
  }, [ok, outcome, hasRichOutcome, sessionActionItems]);

  const postSessionSummary = useMemo((): LiveTrainingCoachPostSessionSummary | null => {
    if (!ok || !outcome) return null;
    return buildLiveTrainingCoachPostSessionSummary({
      outcome,
      continuitySnapshot: session?.continuitySnapshot ?? null,
      actionCandidates: sessionActionItems,
    });
  }, [ok, outcome, session?.continuitySnapshot, sessionActionItems]);

  const coachTruth = useMemo((): LiveTrainingCoachTruthSummary | null => {
    if (!ok || !outcome) return null;
    return buildLiveTrainingCoachTruthSummary({
      outcome,
      actionCandidates: sessionActionItems,
    });
  }, [ok, outcome, sessionActionItems]);

  const nextTrainingHandoff = useMemo((): LiveTrainingNextTrainingHandoff | null => {
    if (!ok || !outcome) return null;
    return buildLiveTrainingNextTrainingHandoff({
      outcome,
      continuitySnapshot: session?.continuitySnapshot ?? null,
      actionCandidates: sessionActionItems,
    });
  }, [ok, outcome, session?.continuitySnapshot, sessionActionItems]);

  const finalizeCarryForwardVm = useMemo(
    () => buildLiveTrainingFinalizeCarryForwardVm(session?.planningSnapshot),
    [session?.planningSnapshot]
  );

  const continuityToNextVm = useMemo(() => {
    if (!ok || !session) return { lines: [] as string[], moreSummaryDirectionsCount: 0 };
    const snap = session.continuitySnapshot;
    if (snap?.summaryLines?.length) {
      const normalized = snap.summaryLines
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean);
      if (normalized.length === 0) return { lines: [], moreSummaryDirectionsCount: 0 };
      // [0] в «Итог» при outcome; здесь без дубля — макс. 2 строки из хвоста.
      const continuityLines = outcome ? normalized.slice(1, 3) : normalized.slice(0, 2);
      const shownFromSummary = outcome
        ? 1 + Math.min(2, Math.max(0, normalized.length - 1))
        : Math.min(2, normalized.length);
      const moreSummaryDirectionsCount = Math.max(0, normalized.length - shownFromSummary);
      return { lines: continuityLines, moreSummaryDirectionsCount };
    }
    if (!outcome) return { lines: [], moreSummaryDirectionsCount: 0 };
    const lines: string[] = [];
    if (outcome.topPlayers.length > 0) {
      const ns = outcome.topPlayers
        .slice(0, 3)
        .map((p) => p.playerName.trim().split(/\s+/)[0] || p.playerName)
        .join(", ");
      lines.push(`В следующий старт можно опереться на работу с: ${ns}.`);
    }
    if (outcome.topDomains.length > 0 && lines.length < 2) {
      lines.push(
        `Темы из сигналов: ${outcome.topDomains
          .slice(0, 3)
          .map((d) => formatLiveTrainingMetricDomain(d))
          .join(", ")}.`
      );
    }
    return { lines: lines.slice(0, 2), moreSummaryDirectionsCount: 0 };
  }, [ok, session, outcome]);

  if (!sid) {
    return (
      <FlagshipScreen scroll={false}>
        <Text style={styles.error}>Некорректная ссылка</Text>
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen scroll={false} contentContainerStyle={styles.content}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.sub}>Загрузка…</Text>
      </FlagshipScreen>
    );
  }

  if (loadError && !session) {
    return (
      <FlagshipScreen contentContainerStyle={styles.content}>
        <Text style={styles.error}>{loadError}</Text>
        <PrimaryButton title="Повторить" onPress={() => void load()} animatedPress />
        <PrimaryButton
          title="На главную"
          variant="outline"
          onPress={() => router.replace("/(tabs)/arena" as Parameters<typeof router.replace>[0])}
          animatedPress
          style={styles.homeBtn}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen contentContainerStyle={styles.scrollContent}>
      <Reanimated.View entering={screenReveal(0)}>
      <GlassCardV2 padding="lg" contentStyle={styles.heroCompleteInner} glow={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={56} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>
          {ok ? "Тренировка зафиксирована" : "Сессия"}
        </Text>
        {session ? (
          <>
            <Text style={styles.sub}>
              {session.teamName} · {formatLiveTrainingMode(session.mode)}
            </Text>
            {completeScheduleContextLine ? (
              <Text style={styles.completeContextSub}>{completeScheduleContextLine}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.sub}>Нет данных</Text>
        )}
        <Text style={styles.lead}>
          {ok
            ? "Наблюдения учтены. Сигналы доступны в карточках игроков и в динамике."
            : "Сессия ещё не подтверждена или недоступна."}
        </Text>
        {ok ? (
          <Text style={styles.flowReminder}>
            В следующий раз: живая тренировка → удержание микрофона → завершить → проверить → подтвердить.
          </Text>
        ) : null}
      </GlassCardV2>
      </Reanimated.View>

      {ok && coachTruth ? (
        <CoachTruthLayerSection truth={coachTruth} />
      ) : null}

      {ok && outcome && postSessionSummary ? (
        <PostSessionCoachDigestSection
          summary={postSessionSummary}
          outcome={outcome}
          onOpenPlayer={(playerId) =>
            router.push(`/player/${encodeURIComponent(playerId)}` as Parameters<typeof router.push>[0])
          }
        />
      ) : null}

      {ok && nextTrainingHandoff ? (
        <NextTrainingHandoffSection
          handoff={nextTrainingHandoff}
          onOpenPlayer={(playerId) =>
            router.push(`/player/${encodeURIComponent(playerId)}` as Parameters<typeof router.push>[0])
          }
        />
      ) : null}

      {ok && outcome ? (
        <GlassCardV2 padding="lg" style={styles.card}>
          <Text style={styles.kicker}>Итог</Text>
          <Text style={styles.statLine}>
            Сигналов аналитики:{" "}
            <Text style={styles.statEm}>{outcome.signalsCreatedCount}</Text>
          </Text>
          <Text style={styles.statLine}>
            Игроков затронуто:{" "}
            <Text style={styles.statEm}>{outcome.affectedPlayersCount}</Text>
          </Text>
          {hasRichOutcome ? (
            <>
              <Text style={styles.statLineMuted}>
                Плюс: {outcome.positiveSignalsCount} · Внимание:{" "}
                {outcome.negativeSignalsCount} · Нейтрально: {outcome.neutralSignalsCount}
              </Text>
              {outcome.includedDraftsCount > 0 ? (
                <Text style={styles.statLineMuted}>
                  Наблюдений к подтверждению было: {outcome.includedDraftsCount}
                  {outcome.excludedDraftsCount > 0
                    ? ` · исключено: ${outcome.excludedDraftsCount}`
                    : ""}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.statLineMuted}>
              Детальный разбор по тональности появится после обновления приложения; сейчас показаны суммарные
              показатели.
            </Text>
          )}
          {outcome.signalsCreatedCount === 0 && outcome.includedDraftsCount > 0 ? (
            <Text style={styles.hintWarn}>
              Сигналы не созданы: проверьте привязку к игроку у наблюдений. Без игрока аналитика не строится.
            </Text>
          ) : null}
          {outcome.signalsCreatedCount === 0 && outcome.includedDraftsCount === 0 ? (
            <Text style={styles.hintWarn}>
              Нет активных наблюдений в этой сессии — нечего было переносить в аналитику.
            </Text>
          ) : null}
          {outcome.draftsFlaggedNeedsReview > 0 ? (
            <Text style={styles.hintMuted}>
              {outcome.draftsFlaggedNeedsReview} наблюдений всё ещё с пометкой «требует проверки» — при
              необходимости уточните их в следующий раз до подтверждения.
            </Text>
          ) : null}
          {outcome.topDomains.length > 0 ? (
            <View style={styles.domainBlock}>
              <Text style={styles.domainKicker}>Чаще всего в фокусе</Text>
              <Text style={styles.domainText}>
                {outcome.topDomains.map((d) => formatLiveTrainingMetricDomain(d)).join(" · ")}
              </Text>
            </View>
          ) : null}
          {session?.continuitySnapshot?.summaryLines?.[0]?.trim() ? (
            <Text style={styles.itogCarryLine} numberOfLines={3}>
              Что переносится дальше:{" "}
              {session.continuitySnapshot.summaryLines[0].trim()}
            </Text>
          ) : null}
        </GlassCardV2>
      ) : null}

      {ok &&
      session?.groupContextSignalRollup &&
      session?.groupContextStampDiagnostic ? (
        <SessionGroupContextAttributionBlock
          rollup={session.groupContextSignalRollup}
          diagnostic={session.groupContextStampDiagnostic}
        />
      ) : null}

      {ok && coachWrapUp ? (
        <CoachWrapUpSection wrapUp={coachWrapUp} />
      ) : null}

      {ok && session?.continuitySnapshot?.trainingQualityFrame ? (
        <TrainingQualityFrameSection frame={session.continuitySnapshot.trainingQualityFrame} />
      ) : null}

      {ok && session?.continuitySnapshot?.priorityAlignmentReview ? (
        <PriorityAlignmentReviewSection review={session.continuitySnapshot.priorityAlignmentReview} />
      ) : null}

      {ok && finalizeCarryForwardVm ? (
        <FinalizeReportCarryForwardSection model={finalizeCarryForwardVm} />
      ) : null}

      {ok && continuityToNextVm.lines.length > 0 ? (
        <ContinuityToNextCycleSection
          lines={continuityToNextVm.lines}
          moreSummaryDirectionsCount={continuityToNextVm.moreSummaryDirectionsCount}
        />
      ) : null}

      {ok ? (
        <GlassCardV2 padding="lg" style={styles.card}>
          <Text style={styles.kicker}>Следующие шаги (live training)</Text>
          <Text style={styles.sessionActionsSub}>
            Черновые ориентиры из сигналов этой тренировки. «Добавить в работу» создаёт задачу в списке созданных
            задач. Стрелка — карточка игрока.
          </Text>
          {sessionActionLoading ? (
            <View style={styles.sessionActionsLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.statLineMuted}>Загрузка…</Text>
            </View>
          ) : sessionActionLowData || sessionActionItems.length === 0 ? (
            <Text style={styles.sessionActionsEmpty}>
              Действия появятся после нескольких подтверждённых наблюдений с персональными сигналами.
            </Text>
          ) : (
            sessionActionItems.slice(0, 4).map((it, idx) => {
              const done = Boolean(it.isMaterialized);
              const busy = sessionMaterializingCandidateId === it.id;
              const anyBusy = sessionMaterializingCandidateId != null;
              const playerId = it.playerId?.trim() ?? "";
              const canOpenPlayer = playerId.length > 0;
              return (
                <View
                  key={it.id}
                  style={[styles.sessionActionRow, idx > 0 && styles.sessionActionRowBorder]}
                >
                  <Pressable
                    onPress={() =>
                      canOpenPlayer
                        ? router.push(
                            `/player/${encodeURIComponent(playerId)}` as Parameters<typeof router.push>[0]
                          )
                        : undefined
                    }
                    disabled={!canOpenPlayer}
                    style={({ pressed }) => [
                      styles.sessionActionMain,
                      pressed && canOpenPlayer && { opacity: 0.88 },
                    ]}
                  >
                    <Text style={styles.sessionActionName}>{it.playerName}</Text>
                    <Text style={styles.sessionActionTitle}>{it.title}</Text>
                    <Text style={styles.sessionActionBody}>{it.body}</Text>
                  </Pressable>
                  <View style={styles.sessionActionSide}>
                    {done ? (
                      <Text style={styles.sessionActionDone}>Добавлено</Text>
                    ) : (
                      <Pressable
                        onPress={() => void handleMaterializeSessionCandidate(it.id)}
                        disabled={anyBusy}
                        style={({ pressed }) => [
                          styles.sessionActionCta,
                          anyBusy && !busy && styles.sessionActionCtaMuted,
                          pressed && !anyBusy && styles.sessionActionCtaPressed,
                        ]}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                          <Text style={styles.sessionActionCtaText}>В работу</Text>
                        )}
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() =>
                        canOpenPlayer
                          ? router.push(
                              `/player/${encodeURIComponent(playerId)}` as Parameters<typeof router.push>[0]
                            )
                          : undefined
                      }
                      disabled={!canOpenPlayer}
                      hitSlop={8}
                      style={({ pressed }) => [
                        pressed && canOpenPlayer && { opacity: 0.7 },
                        !canOpenPlayer && { opacity: 0.35 },
                      ]}
                    >
                      <Ionicons name="chevron-forward" size={22} color={theme.colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
          {!sessionActionLoading && sessionActionItems.length > 0 ? (
            <Pressable
              onPress={() =>
                router.push("/created-actions" as Parameters<typeof router.push>[0])
              }
              style={({ pressed }) => [styles.sessionActionsLinkWrap, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.sessionActionsLink}>Открыть созданные задачи</Text>
            </Pressable>
          ) : null}
        </GlassCardV2>
      ) : null}

      {ok ? (
        <GlassCardV2 padding="lg" style={styles.card}>
          <Text style={styles.kicker}>Черновик отчёта</Text>
          <Text style={styles.reportTeaser}>
            Подготовлен структурированный черновик по фактам этой тренировки (без сочинения текста ИИ). Его можно
            будет редактировать и использовать как основу для родительского и CRM reporting.
          </Text>
          <PrimaryButton
            title="Открыть черновик"
            variant="outline"
            onPress={() =>
              router.push(`/live-training/${sid}/report-draft` as Parameters<typeof router.push>[0])
            }
            animatedPress
            style={styles.reportCta}
          />
        </GlassCardV2>
      ) : null}

      {ok && topPlayers.length > 0 ? (
        <GlassCardV2 padding="lg" style={styles.card}>
          <Text style={styles.kicker}>Кого затронули сильнее всего</Text>
          {topPlayers.map((p) => (
            <Pressable
              key={p.playerId}
              onPress={() =>
                router.push(`/player/${encodeURIComponent(p.playerId)}` as Parameters<typeof router.push>[0])
              }
              style={({ pressed }) => [styles.playerRow, pressed && styles.playerRowPressed]}
            >
                <View style={styles.playerRowMain}>
                  <Text style={styles.playerName}>{p.playerName}</Text>
                  <Text style={styles.playerMeta}>
                    Сигналов: {p.totalSignals} · +{p.positiveCount} / −{p.negativeCount} / ○
                    {p.neutralCount}
                  </Text>
                  {p.topDomains.length > 0 ? (
                    <Text style={styles.playerDomains} numberOfLines={1}>
                      {p.topDomains.map((d) => formatLiveTrainingMetricDomain(d)).join(" · ")}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          ))}
        </GlassCardV2>
      ) : null}

      {ok && topPlayers.length === 0 && outcome && outcome.signalsCreatedCount === 0 ? (
        <GlassCardV2 padding="lg" style={styles.card}>
          <Text style={styles.emptyTitle}>Пока без персональных сигналов</Text>
          <Text style={styles.emptyText}>
            Чтобы здесь появились игроки, на тренировке закрепляйте наблюдения за конкретными игроками. Общие фразы
            без привязки остаются в истории сессии, но не дают сигналов в карточке.
          </Text>
        </GlassCardV2>
      ) : null}

      {ok && session && topPlayers.length > 0 ? (
        <PrimaryButton
          title={`Открыть: ${topPlayers[0].playerName}`}
          variant="outline"
          onPress={() =>
            router.push(
              `/player/${encodeURIComponent(topPlayers[0].playerId)}` as Parameters<typeof router.push>[0]
            )
          }
          animatedPress
          style={styles.ctaOutline}
        />
      ) : null}

      <PrimaryButton
        title="На главную"
        onPress={() => router.replace("/(tabs)/arena" as Parameters<typeof router.replace>[0])}
        animatedPress
        glow
        style={styles.cta}
      />
      <PrimaryButton
        title="Новая тренировка"
        variant="outline"
        onPress={() =>
          router.replace(LIVE_TRAINING_START_ROUTE as Parameters<typeof router.replace>[0])
        }
        animatedPress
        style={styles.ctaOutline}
      />

      {ok ? (
        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>
            Данные уже отражаются в разделе «Что зафиксировано на тренировках» в профиле игрока и в трендах по
            сессиям.
          </Text>
        </View>
      ) : null}
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingBottom: theme.layout.screenBottom + theme.spacing.xl,
  },
  scrollContent: {
    paddingBottom: theme.layout.screenBottom + theme.spacing.xl,
    gap: theme.spacing.md,
  },
  heroCompleteInner: {
    alignItems: "center",
  },
  iconWrap: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.title,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
  },
  sub: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  completeContextSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    lineHeight: 18,
  },
  lead: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: theme.spacing.sm,
  },
  flowReminder: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    fontStyle: "italic",
  },
  card: {
    width: "100%",
    marginBottom: 0,
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.sm,
  },
  statLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statEm: {
    fontWeight: "700",
    color: theme.colors.primary,
  },
  statLineMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  hintWarn: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  hintMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  domainBlock: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  domainKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  domainText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  itogCarryLine: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  coachWrapUpGlass: {
    width: "100%",
    marginBottom: 0,
  },
  coachWrapUpAccent: {
    borderLeftWidth: 4,
    paddingLeft: theme.spacing.sm,
  },
  coachWrapUpKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  coachWrapUpHeadline: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  coachWrapUpLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  coachWrapUpNext: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  qualityFrameGlass: {
    width: "100%",
    marginBottom: 0,
  },
  qualityFrameAccent: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
  },
  qualityFrameLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  qualityFrameHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
  priorityGlass: {
    width: "100%",
    marginBottom: 0,
  },
  priorityNeutralAccent: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(255,255,255,0.12)",
    paddingLeft: theme.spacing.sm,
  },
  priorityNeutralLine: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  priorityAlignedAccent: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  priorityDetailMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  priorityUncoveredMuted: {
    ...theme.typography.caption,
    color: theme.colors.text,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
    opacity: 0.85,
  },
  continuityNextGlass: {
    width: "100%",
    marginBottom: 0,
  },
  continuityNextAccent: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  continuityNextKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  continuityNextLine: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  continuityNextMoreHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  reportTeaser: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  reportCta: {
    marginTop: theme.spacing.xs,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  playerRowPressed: {
    opacity: 0.85,
  },
  playerRowMain: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    ...theme.typography.subtitle,
    fontWeight: "600",
  },
  playerMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  playerDomains: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginTop: 4,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  cta: {
    width: "100%",
    marginTop: theme.spacing.sm,
  },
  ctaOutline: {
    width: "100%",
    marginTop: theme.spacing.sm,
  },
  footerWrap: {
    width: "100%",
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  homeBtn: {
    marginTop: theme.spacing.md,
  },
  sessionActionsSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  sessionActionsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: theme.spacing.sm,
  },
  sessionActionsEmpty: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    paddingVertical: theme.spacing.xs,
  },
  sessionActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.sm,
  },
  sessionActionRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  sessionActionMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: theme.spacing.xs,
  },
  sessionActionSide: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 8,
    paddingTop: 2,
  },
  sessionActionCta: {
    minWidth: 88,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionActionCtaPressed: {
    opacity: 0.88,
  },
  sessionActionCtaMuted: {
    opacity: 0.4,
  },
  sessionActionCtaText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  sessionActionDone: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  sessionActionsLinkWrap: {
    paddingTop: theme.spacing.sm,
  },
  sessionActionsLink: {
    fontSize: 13,
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  sessionActionName: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: 2,
  },
  sessionActionTitle: {
    ...theme.typography.subtitle,
    fontWeight: "600",
    marginBottom: 4,
  },
  sessionActionBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  handoffGlass: {
    width: "100%",
    marginBottom: 0,
  },
  handoffGlassAccent: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  handoffTitle: {
    ...theme.typography.subtitle,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  handoffBlockTitle: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: 11,
  },
  handoffBullet: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  handoffLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  handoffThemes: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
  },
  handoffMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  handoffPlayerRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  handoffPlayerName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  handoffPlayerNote: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  handoffActionRow: {
    marginBottom: theme.spacing.sm,
  },
  handoffActionScope: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  handoffActionTitle: {
    ...theme.typography.subtitle,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  handoffActionSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  handoffDeferred: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    lineHeight: 18,
    marginBottom: 4,
  },
  truthGlass: {
    width: "100%",
    marginBottom: 0,
  },
  truthKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
    fontSize: 10,
  },
  truthLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  truthLineMuted: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  truthEm: {
    fontWeight: "700",
    color: theme.colors.primary,
  },
  truthHint: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  digestGlass: {
    width: "100%",
    marginBottom: 0,
  },
  digestGlassAccent: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.sm,
  },
  digestKicker: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.spacing.xs,
  },
  digestMix: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: "600",
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  digestReviewHint: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginBottom: theme.spacing.sm,
  },
  digestBlockTitle: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: "700",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontSize: 11,
  },
  digestName: {
    ...theme.typography.subtitle,
    fontSize: 15,
    fontWeight: "600",
  },
  digestReason: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  digestMuted: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  digestThemes: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  digestCarryLine: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  digestActionRow: {
    marginBottom: theme.spacing.sm,
  },
  digestActionTitle: {
    ...theme.typography.subtitle,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  digestActionSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  digestActionFoot: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
  digestRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  groupCtxShell: {
    width: "100%",
    marginTop: theme.layout.sectionGap,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder,
    backgroundColor: "rgba(18, 25, 32, 0.65)",
  },
  groupCtxKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  groupCtxLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  groupCtxValue: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  groupCtxLineMuted: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  groupCtxMono: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    lineHeight: 15,
  },
  groupCtxNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
});

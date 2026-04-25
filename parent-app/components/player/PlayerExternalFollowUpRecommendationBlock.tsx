import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { ApiRequestError } from "@/lib/api";
import { setArenaAutoMode } from "@/lib/arenaAutoMode";
import {
  classifyFollowUpPostOutcome,
  followUpNonAutonomousOutcomeCopy,
  followUpPostInflight,
  type FollowUpPostOutcome,
} from "@/lib/parentArenaExternalFollowUpHonesty";
import {
  confirmArenaAutonomousMatch,
  createArenaExternalFollowUpRequest,
  getLatestArenaExternalTrainingRequest,
  type ExternalFollowUpRecommendationView,
} from "@/services/arenaExternalTrainingService";

export type ArenaFollowUpPostDetail = {
  nonAutonomousPost?: FollowUpPostOutcome;
};

type Props = {
  playerId: string;
  recommendation: ExternalFollowUpRecommendationView;
  onReRequestSuccess?: (detail?: ArenaFollowUpPostDetail) => void | Promise<void>;
  /** Локальный флаг: родитель уже разрешил Арене действовать для этого игрока. */
  arenaAutoMode?: boolean;
  onArenaAutoModeEnabled?: () => void;
  /** Родитель скрывает секцию целиком (без пустого SectionCard). */
  onDeferred?: () => void;
};

const AUTONOMOUS_TITLE = "Арена нашла решение для развития";
const AUTONOMOUS_SUMMARY =
  "Арена уже подобрала тренера на основе текущего состояния игрока. Разрешите ей действовать — она согласует тренировку и передаст результат в профиль игрока.";
const AUTONOMOUS_CTA = "Разрешить Арене действовать";
const AUTONOMOUS_CTA_SUBLINE =
  "Арена сама подберёт тренера, согласует тренировку и добавит результат в профиль игрока.";
const AUTONOMOUS_AUTO_MODE_LINE =
  "Арена уже занимается организацией следующего шага.";

/** Защита от параллельного auto-confirm (Strict Mode / повторный эффект). */
const autonomousConfirmInflight = new Set<string>();

function isAutonomousConflict(e: unknown): boolean {
  return (
    e instanceof ApiRequestError &&
    (e.status === 409 || /активный цикл/i.test(e.message))
  );
}

export function PlayerExternalFollowUpRecommendationBlock({
  playerId,
  recommendation,
  onReRequestSuccess,
  arenaAutoMode = false,
  onArenaAutoModeEnabled,
  onDeferred,
}: Props) {
  const [deferred, setDeferred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLine, setSuccessLine] = useState(false);
  /** Сообщение после неавтономного POST (различаем новый запрос vs уже активный без отчёта). */
  const [nonAutonomousSuccessCopy, setNonAutonomousSuccessCopy] = useState<string | null>(null);

  if (deferred) return null;

  const autonomous = Boolean(recommendation.trainerCandidate);
  const isStop = recommendation.type === "stop_recommended";
  const isDeferLoad = recommendation.type === "defer_due_to_load";
  const calmNoCta = isStop || isDeferLoad;
  const autonomousUi = autonomous && !calmNoCta;
  const tc = recommendation.trainerCandidate;

  const displayTitle =
    isStop || isDeferLoad
      ? recommendation.title
      : autonomousUi
        ? AUTONOMOUS_TITLE
        : recommendation.title;
  const displaySummary = calmNoCta
    ? recommendation.summary
    : autonomousUi
      ? AUTONOMOUS_SUMMARY
      : recommendation.summary;

  const showPrimary = Boolean(recommendation.actionLabel);

  const showAutonomousPrimary =
    autonomousUi && showPrimary && (!arenaAutoMode || Boolean(error));

  const showNonAutonomousPrimary = showPrimary && !autonomousUi;

  const primaryLabel =
    autonomousUi && showPrimary
      ? error && arenaAutoMode
        ? "Повторить"
        : AUTONOMOUS_CTA
      : (recommendation.actionLabel ?? "");

  const showAutoModeCalmLine =
    arenaAutoMode &&
    autonomousUi &&
    showPrimary &&
    !error &&
    !loading &&
    !successLine;

  const runAutonomousFlow = useCallback(async () => {
    const pid = playerId.trim();
    setError(null);
    setNonAutonomousSuccessCopy(null);
    setLoading(true);
    try {
      await confirmArenaAutonomousMatch(pid);
      await setArenaAutoMode(pid, true);
      onArenaAutoModeEnabled?.();
      setSuccessLine(true);
      await onReRequestSuccess?.();
    } catch (e) {
      if (isAutonomousConflict(e)) {
        await setArenaAutoMode(pid, true);
        onArenaAutoModeEnabled?.();
        setSuccessLine(true);
        await onReRequestSuccess?.();
      } else {
        const msg =
          e instanceof ApiRequestError
            ? e.message
            : "Не удалось выполнить шаг. Попробуйте ещё раз.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [playerId, onArenaAutoModeEnabled, onReRequestSuccess]);

  useEffect(() => {
    if (!arenaAutoMode || !autonomousUi || !showPrimary) return;
    if (successLine || error || loading) return;

    const pid = playerId.trim();
    if (!pid || autonomousConfirmInflight.has(pid)) return;

    autonomousConfirmInflight.add(pid);
    void (async () => {
      setError(null);
      setLoading(true);
      try {
        await confirmArenaAutonomousMatch(pid);
        setSuccessLine(true);
        await onReRequestSuccess?.();
      } catch (e) {
        if (isAutonomousConflict(e)) {
          setSuccessLine(true);
          await onReRequestSuccess?.();
        } else {
          const msg =
            e instanceof ApiRequestError
              ? e.message
              : "Не удалось выполнить шаг. Попробуйте ещё раз.";
          setError(msg);
        }
      } finally {
        autonomousConfirmInflight.delete(pid);
        setLoading(false);
      }
    })();
    // loading намеренно не в deps: повтор при смене loading даёт лишний проход эффекта.
  }, [
    arenaAutoMode,
    autonomousUi,
    showPrimary,
    playerId,
    successLine,
    error,
    onReRequestSuccess,
  ]);

  const onPrimary = async () => {
    triggerHaptic();
    if (autonomous) {
      await runAutonomousFlow();
      return;
    }
    const pid = playerId.trim();
    if (!pid || !followUpPostInflight.tryBegin(pid)) return;
    setError(null);
    setNonAutonomousSuccessCopy(null);
    setLoading(true);
    try {
      let preLatestId: string | null | undefined;
      try {
        const pre = await getLatestArenaExternalTrainingRequest(pid);
        preLatestId = pre?.id ?? null;
      } catch {
        preLatestId = undefined;
      }
      const result = await createArenaExternalFollowUpRequest(pid);
      const nonAutonomousPost = classifyFollowUpPostOutcome(preLatestId, result.id);
      setNonAutonomousSuccessCopy(followUpNonAutonomousOutcomeCopy(nonAutonomousPost));
      setSuccessLine(true);
      await onReRequestSuccess?.({ nonAutonomousPost });
    } catch (e) {
      const msg =
        e instanceof ApiRequestError
          ? e.message
          : "Не удалось выполнить шаг. Попробуйте ещё раз.";
      setError(msg);
    } finally {
      followUpPostInflight.end(pid);
      setLoading(false);
    }
  };

  const onDefer = () => {
    triggerHaptic();
    if (onDeferred) {
      onDeferred();
    } else {
      setDeferred(true);
    }
  };

  return (
    <View
      style={[styles.wrap, calmNoCta && styles.wrapStop]}
      accessibilityRole="text"
    >
      {isStop ? (
        <View style={styles.stopHeader}>
          <Ionicons name="pause-circle-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.title, styles.titleStop]}>{displayTitle}</Text>
        </View>
      ) : isDeferLoad ? (
        <View style={styles.stopHeader}>
          <Ionicons name="time-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.title, styles.titleStop]}>{displayTitle}</Text>
        </View>
      ) : (
        <Text style={styles.title}>{displayTitle}</Text>
      )}
      <Text style={[styles.summary, calmNoCta && styles.summaryStop]}>{displaySummary}</Text>
      {tc && recommendation.trainerPickExplanation ? (
        <View style={styles.trainerCard}>
          <Text style={styles.trainerCardKicker}>Тренер от Арены</Text>
          <Text style={styles.trainerName}>{tc.coachName}</Text>
          <Text style={styles.trainerDesc}>{tc.shortDescription}</Text>
          <Text style={styles.trainerWhy}>{recommendation.trainerPickExplanation}</Text>
        </View>
      ) : null}
      <Text style={[styles.sourceNote, calmNoCta && styles.sourceNoteStop]}>
        {recommendation.sourceNote}
      </Text>
      {recommendation.explanationPoints.length > 0 ? (
        <View style={styles.explainBlock}>
          <Text style={styles.explainTitle}>Почему такое решение</Text>
          {recommendation.explanationPoints.map((line, i) => (
            <Text key={`x-${i}-${line.slice(0, 16)}`} style={styles.explainLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {!calmNoCta && !autonomousUi ? (
        <Text style={styles.continuityHint}>
          Арена продолжает дополнительную работу — опираясь на отчёт дополнительного источника.
        </Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {successLine ? (
        <Text style={styles.successText}>
          {autonomous
            ? arenaAutoMode
              ? "Шаг выполнен. Арена продолжает организацию."
              : "Автоматический режим включён. Арена продолжает организацию тренировки."
            : nonAutonomousSuccessCopy}
        </Text>
      ) : null}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accentBlue} />
          <Text style={styles.loadingLabel}>
            {autonomous ? "Арена фиксирует согласование…" : "Формируем следующий цикл…"}
          </Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        {showAutonomousPrimary || showNonAutonomousPrimary ? (
          <PrimaryButton
            label={primaryLabel}
            onPress={() => {
              void onPrimary();
            }}
            disabled={loading}
          />
        ) : null}
        {autonomousUi && !arenaAutoMode && showPrimary ? (
          <Text style={styles.autonomousSubline}>{AUTONOMOUS_CTA_SUBLINE}</Text>
        ) : null}
        {showAutoModeCalmLine ? (
          <Text style={styles.autoModeCalmLine}>{AUTONOMOUS_AUTO_MODE_LINE}</Text>
        ) : null}
        {recommendation.deferLabel ? (
          <SecondaryButton
            label={recommendation.deferLabel}
            onPress={onDefer}
            disabled={loading}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(59,130,246,0.05)",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.2)",
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.level1,
    gap: spacing.sm,
  },
  wrapStop: {
    backgroundColor: "rgba(148,163,184,0.08)",
    borderColor: "rgba(148,163,184,0.35)",
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  titleStop: {
    flex: 1,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  summaryStop: {
    color: colors.textSecondary,
  },
  trainerCard: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(15,23,42,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.25)",
    gap: spacing.xs,
  },
  trainerCardKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  trainerDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  trainerWhy: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 4,
  },
  sourceNote: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sourceNoteStop: {
    color: colors.textMuted,
    opacity: 0.92,
  },
  explainBlock: {
    marginTop: spacing.sm,
    gap: 5,
  },
  explainTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: colors.textMuted,
  },
  explainLine: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    opacity: 0.9,
  },
  continuityHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  successText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.accentBlue,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.error,
    marginTop: spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  loadingLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  autonomousSubline: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    opacity: 0.92,
    marginTop: 2,
  },
  autoModeCalmLine: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    opacity: 0.95,
  },
});

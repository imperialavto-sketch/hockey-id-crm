import { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import type { ArenaAutonomousMatchView } from "@/services/arenaExternalTrainingService";

type Props = {
  match: ArenaAutonomousMatchView;
  /** Включён локальный авто-режим — доп. копирайт про живое обновление статуса. */
  arenaAutoMode?: boolean;
};

type StepState = "done" | "current" | "upcoming";

const STEPS: readonly { key: string; title: string }[] = [
  { key: "ack", title: "Подтверждение принято — демо-процесс запущен" },
  { key: "coord", title: "Имитация согласования (mock, не агент)" },
  { key: "slot", title: "Слот из заглушки (не реальное бронирование)" },
  { key: "result", title: "После демо-занятия — итог во внешнем контуре" },
];

function stepStatesForMatch(match: ArenaAutonomousMatchView): StepState[] {
  if (match.displayPhase === "completed") {
    return ["done", "done", "done", "done"];
  }
  if (match.displayPhase === "scheduled") {
    return ["done", "done", "current", "upcoming"];
  }
  const line = match.statusLine.toLowerCase();
  if (
    line.includes("договаривается") ||
    line.includes("тренером") ||
    line.includes("имитац") ||
    line.includes("демо") ||
    line.includes("mock")
  ) {
    return ["done", "current", "upcoming", "upcoming"];
  }
  return ["current", "upcoming", "upcoming", "upcoming"];
}

function liveOrchestrationCaption(match: ArenaAutonomousMatchView): string {
  if (match.displayPhase === "completed") {
    return "Демо-цикл завершён; итог — во внешнем контуре ниже (не школьный live Arena).";
  }
  if (match.displayPhase === "scheduled") {
    return "Показан пример слота (заглушка). Реальные бронирования и автономные переговоры здесь не выполняются.";
  }
  const line = match.statusLine.toLowerCase();
  if (
    line.includes("договаривается") ||
    line.includes("тренером") ||
    line.includes("имитац") ||
    line.includes("демо") ||
    line.includes("mock")
  ) {
    return "Имитация шагов согласования (mock matching) — не живой агент и не переговоры с тренером.";
  }
  if (line.includes("подтвержд")) {
    return "Демо-обработка подтверждения: статусы задаются правилами сценария, без автономного AI.";
  }
  return "Демонстрация статусов внешнего контура; обновления сценарные, не оркестрация в реальном времени.";
}

const OUTCOME_IN_PROGRESS =
  "После демо-сценария во внешнем контуре может появиться краткий итог (MVP).";
const OUTCOME_COMPLETED = "Итог демо-цикла записан во внешний контур профиля (не школьный отчёт).";

const COMPLETION_HEADLINE =
  "Демо-процесс внешнего контура завершён; добавлен краткий итог (mock/stub).";

function outcomeCopyForMatch(match: ArenaAutonomousMatchView): string {
  return match.displayPhase === "completed"
    ? OUTCOME_COMPLETED
    : OUTCOME_IN_PROGRESS;
}

const LIVE_REFRESH_LINE =
  "Статусы обновляются по демо-таймерам (не реальная организация тренировки).";

/** Короткая метка у активного шага pipeline (без спиннеров и «системных» формулировок). */
function liveStepLabel(match: ArenaAutonomousMatchView): string {
  if (match.displayPhase === "completed") return "";
  const line = match.statusLine.toLowerCase();
  if (
    line.includes("договаривается") ||
    line.includes("тренером") ||
    line.includes("имитац") ||
    line.includes("демо") ||
    line.includes("mock")
  ) {
    return "имитация шага";
  }
  return "в процессе";
}

function LiveDot({ active }: { active: boolean }) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!active) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.42,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);

  if (!active) {
    return <View style={styles.dotInactive} />;
  }

  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotGlow, { opacity }]} />
      <View style={styles.dotCore} />
    </View>
  );
}

/**
 * ❗ NOT CORE SCHOOL SSOT — внешний контур (PHASE 6).
 * ⚠ MOCK MATCHING / демо-orchestration после согласия родителя; ⚠ AI-ASSISTED, NOT AUTONOMOUS AGENT.
 */
export function PlayerAutonomousArenaMatchBlock({
  match,
  arenaAutoMode = false,
}: Props) {
  const states = useMemo(() => stepStatesForMatch(match), [match]);
  const caption = useMemo(() => liveOrchestrationCaption(match), [match]);
  const outcomeLine = useMemo(() => outcomeCopyForMatch(match), [match]);
  const stepLiveCaption = useMemo(() => liveStepLabel(match), [match]);
  const isComplete = match.displayPhase === "completed";
  const showLiveEyebrow = !isComplete;

  const phaseKey = `${match.displayPhase}|${match.statusLine}`;
  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const phaseFadePrimed = useRef(false);

  useEffect(() => {
    if (!phaseFadePrimed.current) {
      phaseFadePrimed.current = true;
      fadeOpacity.setValue(1);
      return;
    }
    fadeOpacity.setValue(0.82);
    Animated.timing(fadeOpacity, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [phaseKey, fadeOpacity]);

  return (
    <View style={styles.wrap} accessibilityRole="text">
      {showLiveEyebrow ? (
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>Сейчас в работе</Text>
        </View>
      ) : (
        <View style={styles.eyebrowRow}>
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={colors.success}
            style={styles.eyebrowIcon}
          />
          <Text style={styles.eyebrowDone}>Процесс завершён</Text>
        </View>
      )}

      {isComplete ? (
        <Text style={styles.completionHeadline}>{COMPLETION_HEADLINE}</Text>
      ) : null}

      <Text style={styles.title}>Внешний контур: демо-процесс</Text>
      {arenaAutoMode && !isComplete ? (
        <Text style={styles.liveRefreshLine}>{LIVE_REFRESH_LINE}</Text>
      ) : null}
      <Text style={styles.coachLine}>{match.coachName}</Text>

      <Animated.View style={[styles.fadeBlock, { opacity: fadeOpacity }]}>
        <Text style={styles.caption}>{caption}</Text>

        <View style={styles.timeline}>
          {STEPS.map((step, index) => {
            const state = states[index]!;
            const isLast = index === STEPS.length - 1;
            const showStepLive = state === "current" && !isComplete;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  {state === "done" ? (
                    <View style={styles.stepDotDone}>
                      <Ionicons
                        name="checkmark"
                        size={10}
                        color={colors.success}
                      />
                    </View>
                  ) : state === "current" ? (
                    <LiveDot active />
                  ) : (
                    <View style={styles.stepDotUpcoming} />
                  )}
                  {!isLast ? (
                    <View
                      style={[
                        styles.stepConnector,
                        state === "done"
                          ? styles.stepConnectorDone
                          : styles.stepConnectorMuted,
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.stepBody}>
                  <Text
                    style={[
                      styles.stepTitle,
                      state === "done" && styles.stepTitleDone,
                      state === "current" && styles.stepTitleCurrent,
                      state === "upcoming" && styles.stepTitleUpcoming,
                    ]}
                  >
                    {step.title}
                  </Text>
                  {showStepLive ? (
                    <View style={styles.stepLiveRow} importantForAccessibility="no-hide-descendants">
                      <Text style={styles.stepLiveDot}>●</Text>
                      <Text style={styles.stepLiveLabel}>{stepLiveCaption}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {match.displayPhase === "scheduled" && match.proposedSlotStub ? (
          <View style={styles.slotBox}>
            <Text style={styles.slotLabel}>Предложение по слоту</Text>
            <Text style={styles.slotLine}>{match.proposedSlotStub}</Text>
          </View>
        ) : null}

        <View style={styles.outcomeStripe} accessibilityRole="text">
          <View style={styles.outcomeMark} />
          <View style={styles.outcomeBody}>
            <Text style={styles.outcomeText}>{outcomeLine}</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.hint}>
        Дополнительный контур ниже по приоритету, чем работа команды в школе — без смены вашего основного контекста.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(59,130,246,0.05)",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.18)",
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.level1,
    gap: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
    opacity: 0.9,
  },
  eyebrowDone: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: "rgba(57,217,138,0.85)",
  },
  eyebrowIcon: {
    marginRight: 2,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentSecondary,
    opacity: 0.9,
    marginRight: 2,
  },
  completionHeadline: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: spacing.xs,
    opacity: 0.94,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  liveRefreshLine: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 4,
    opacity: 0.88,
    fontWeight: "400",
  },
  fadeBlock: {
    gap: spacing.sm,
  },
  coachLine: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: spacing.xs,
    opacity: 0.95,
  },
  timeline: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 44,
  },
  stepRail: {
    width: 22,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  stepConnector: {
    width: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  stepConnectorDone: {
    backgroundColor: "rgba(57,217,138,0.35)",
  },
  stepConnectorMuted: {
    backgroundColor: colors.borderSoft,
    opacity: 0.65,
  },
  stepBody: {
    flex: 1,
    paddingBottom: spacing.sm,
    justifyContent: "flex-start",
    paddingTop: 1,
  },
  stepTitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  stepTitleDone: {
    color: colors.textMuted,
    opacity: 0.72,
    fontWeight: "400",
  },
  stepTitleCurrent: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontWeight: "600",
    opacity: 1,
  },
  stepTitleUpcoming: {
    color: colors.textMuted,
    opacity: 0.42,
    fontWeight: "400",
  },
  stepLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
    paddingLeft: 1,
  },
  stepLiveDot: {
    fontSize: 8,
    lineHeight: 12,
    color: colors.accentSecondary,
    opacity: 0.95,
    marginTop: 1,
  },
  stepLiveLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    color: colors.textMuted,
    letterSpacing: 0.15,
    opacity: 0.88,
  },
  stepDotDone: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(57,217,138,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(57,217,138,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotUpcoming: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderSoft,
    marginTop: 5,
    opacity: 0.55,
  },
  dotWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dotGlow: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accentBlue,
    opacity: 0.5,
  },
  dotCore: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentSecondary,
  },
  dotInactive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentBlue,
    marginTop: 5,
    opacity: 0.85,
  },
  slotBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: 4,
    opacity: 0.85,
  },
  slotLine: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontStyle: "italic",
    opacity: 0.92,
  },
  outcomeStripe: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  outcomeMark: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(220,230,255,0.14)",
  },
  outcomeBody: {
    flex: 1,
  },
  outcomeText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    fontWeight: "400",
    opacity: 0.94,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: spacing.xs,
    opacity: 0.88,
  },
});

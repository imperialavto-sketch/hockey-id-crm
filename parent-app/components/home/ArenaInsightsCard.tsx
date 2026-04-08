import React, { memo, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  getPulseMomentPresentation,
  type ArenaHomePreviewModel,
} from "@/lib/parentArenaHomeModel";
import { ArenaMetricTile } from "@/components/home/ArenaMetricTile";
import { DevelopmentPulseGraph } from "@/components/home/DevelopmentPulseGraph";
import { spacing, radius, feedback } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

export type ArenaInsightsCoachAction = {
  label: string;
  prompt: string;
  actionKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Props = {
  model: ArenaHomePreviewModel;
  coachActions: ArenaInsightsCoachAction[];
  onOpenAnalytics: () => void;
  onCoachAction: (prompt: string, actionKey: string) => void;
  /**
   * Главная: одна основная CTA, вторая строка chips скрыта — «сцена», без конкуренции за фокус.
   * Для других экранов можно включить обратно.
   */
  showCoachChips?: boolean;
};

/** Очень слабый «живой» фон + акцент справа (точка «сейчас»); график не трогаем. */
function PulseStageLiveBackdrop() {
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, {
        duration: 5200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    return () => {
      cancelAnimation(phase);
    };
  }, [phase]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(phase.value, [0, 1], [-12, 12]) },
    ],
    opacity: 0.045 + 0.035 * phase.value,
  }));

  const rimStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + 0.07 * phase.value,
  }));

  return (
    <>
      <Animated.View
        style={[styles.pulseLiveSheet, sheetStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(56,189,248,0.07)",
            "rgba(147,197,253,0.05)",
            "transparent",
          ]}
          locations={[0, 0.38, 0.62, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.pulseRightWash, rimStyle]} pointerEvents="none">
        <LinearGradient
          colors={["transparent", "rgba(56,189,248,0.14)", "rgba(96,165,250,0.07)"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </>
  );
}

function StatusChip({ model }: { model: ArenaHomePreviewModel }) {
  const warm = model.statusChip === "fresh";
  return (
    <View
      style={[
        styles.chip,
        warm ? styles.chipFresh : styles.chipAi,
      ]}
    >
      <LinearGradient
        colors={
          warm
            ? ["rgba(56,189,248,0.1)", "rgba(12,38,68,0.48)"]
            : ["rgba(99,102,241,0.08)", "rgba(14,38,68,0.42)"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.chipText} numberOfLines={1}>
        {model.statusChipLabel}
      </Text>
    </View>
  );
}

export const ArenaInsightsCard = memo(function ArenaInsightsCard({
  model,
  coachActions,
  onOpenAnalytics,
  onCoachAction,
  showCoachChips = true,
}: Props) {
  const pulseMoment = useMemo(() => getPulseMomentPresentation(model), [model]);

  return (
    <View style={styles.root}>
      {/* Контекст + статус: якорь сверху, KPI и график ниже читаются как «эфир» */}
      <View style={styles.topBand}>
        <View style={styles.topBandText}>
          <Text style={styles.insight} numberOfLines={2} ellipsizeMode="tail">
            {model.insightLine}
          </Text>
          {model.secondaryLine ? (
            <Text style={styles.secondary} numberOfLines={1} ellipsizeMode="tail">
              {model.secondaryLine}
            </Text>
          ) : null}
        </View>
        <StatusChip model={model} />
      </View>

      {/* Главная «сцена» карточки — пульс идёт сразу после инсайта */}
      <View style={styles.pulseStage}>
        <View style={styles.pulseStageRadial} pointerEvents="none">
          <LinearGradient
            colors={[
              "rgba(56, 165, 250, 0.08)",
              "rgba(12, 48, 92, 0.22)",
              "rgba(4, 14, 36, 0.55)",
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0.5, y: 0.1 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <PulseStageLiveBackdrop />
        <View style={styles.pulseStageContent}>
          <View style={styles.pulseMicroHeader}>
            <Text style={styles.pulseMicroLabel}>Сейчас</Text>
            <Text style={styles.pulseMicroStatus} numberOfLines={1}>
              <Text style={styles.pulseMicroMark}>{pulseMoment.mark}</Text>
              {pulseMoment.statusLabel}
            </Text>
          </View>
          <DevelopmentPulseGraph
            samples={model.pulseSamples}
            dotT={model.pulseDotT}
            visualPreset="arenaHero"
          />
          <View style={styles.pulseMicroTextBlock}>
            <Text style={styles.pulseFootnote} numberOfLines={1} ellipsizeMode="tail">
              {pulseMoment.footnote}
            </Text>
            <Text
              style={styles.pulseInterpretation}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {pulseMoment.interpretationLine}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        {model.metrics.map((m) => (
          <ArenaMetricTile key={m.id} metric={m} supporting />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Смотреть развитие и аналитику"
        onPress={() => {
          triggerHaptic();
          onOpenAnalytics();
        }}
        style={({ pressed }) => [styles.ctaPrimary, pressed && { opacity: feedback.pressedOpacity }]}
      >
        <LinearGradient
          colors={["rgba(56,189,248,0.32)", "rgba(59,130,246,0.2)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="analytics-outline" size={18} color="rgba(240,249,255,0.92)" />
        <Text style={styles.ctaPrimaryText}>Смотреть развитие</Text>
        <Ionicons name="chevron-forward" size={17} color="rgba(186,218,255,0.65)" />
      </Pressable>

      {showCoachChips && coachActions.length > 0 ? (
        <View style={styles.coachRow}>
          {coachActions.slice(0, 2).map((a) => (
            <Pressable
              key={a.actionKey}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => {
                triggerHaptic();
                onCoachAction(a.prompt, a.actionKey);
              }}
              style={({ pressed }) => [
                styles.coachChip,
                pressed && { opacity: feedback.pressedOpacity },
              ]}
            >
              <Ionicons name={a.icon} size={16} color="rgba(199,232,255,0.88)" />
              <Text style={styles.coachChipText} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    marginTop: 2,
  },
  topBand: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  topBandText: {
    flex: 1,
    minWidth: 0,
  },
  chip: {
    position: "relative",
    borderRadius: radius.capsule,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    maxWidth: "38%",
    alignSelf: "flex-start",
  },
  chipAi: {
    borderColor: "rgba(139, 180, 255, 0.28)",
  },
  chipFresh: {
    borderColor: "rgba(125,211,252,0.36)",
  },
  chipText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: "rgba(218, 234, 255, 0.85)",
  },
  insight: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "rgba(252, 253, 255, 0.96)",
    marginBottom: 3,
  },
  secondary: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    color: "rgba(200, 220, 248, 0.52)",
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  pulseStage: {
    position: "relative",
    marginTop: 0,
    marginBottom: spacing.xs,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(5, 18, 40, 0.72)",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#88c8ff",
        shadowOpacity: 0.07,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  pulseStageRadial: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.95,
  },
  pulseLiveSheet: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "-24%",
    width: "148%",
  },
  pulseRightWash: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "44%",
  },
  pulseStageContent: {
    position: "relative",
    zIndex: 1,
  },
  pulseMicroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pulseMicroLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.18,
    textTransform: "uppercase",
    color: "rgba(160, 205, 255, 0.68)",
  },
  pulseMicroStatus: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(238, 246, 255, 0.94)",
    textAlign: "right",
  },
  pulseMicroMark: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(125, 211, 252, 0.98)",
    marginRight: 6,
  },
  pulseMicroTextBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  pulseFootnote: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.15,
    color: "rgba(170, 205, 245, 0.55)",
    marginBottom: 3,
  },
  pulseInterpretation: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 15,
    letterSpacing: 0.02,
    color: "rgba(220, 232, 250, 0.78)",
  },
  ctaPrimary: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md + 2,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(140, 210, 255, 0.22)",
  },
  ctaPrimaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.15,
    color: "rgba(252, 254, 255, 0.98)",
  },
  coachRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  coachChip: {
    flex: 1,
    minWidth: "44%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(12, 40, 72, 0.4)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(160, 210, 255, 0.16)",
  },
  coachChipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(220, 235, 255, 0.88)",
  },
});

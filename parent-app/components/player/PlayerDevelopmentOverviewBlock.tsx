import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius } from "@/constants/theme";
import type { PlayerDevelopmentOverviewView } from "@/services/arenaExternalTrainingService";

type Props = {
  overview: PlayerDevelopmentOverviewView;
  /** Показывать переход к блоку действия (follow-up / autonomous) сразу под overview. */
  showActionBridge?: boolean;
};

const LEAD =
  "Арена видит картину по последним данным игрока и допконтура; ниже — зачем это важно и на что опирается фаза.";

const OVERVIEW_TO_ACTION_BRIDGE =
  "Именно поэтому Арена рекомендует действие ниже.";

/**
 * Пояснение «почему так»: спокойнее и аналитичнее верхнего блока «Сейчас».
 */
export function PlayerDevelopmentOverviewBlock({
  overview,
  showActionBridge = false,
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.kicker}>Почему это важно</Text>
      <Text style={styles.lead}>{LEAD}</Text>
      <Text style={styles.phaseLabel}>{overview.phaseLabel}</Text>
      <Text style={styles.summary}>{overview.summary}</Text>
      {overview.explanationPoints.length > 0 ? (
        <View style={styles.explainBlock}>
          <Text style={styles.explainTitle}>На что опирается решение</Text>
          {overview.explanationPoints.map((line, i) => (
            <Text key={`e-${i}-${line.slice(0, 16)}`} style={styles.explainLine}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {overview.signals.length > 0 ? (
        <View style={styles.signalsSection}>
          <Text style={styles.signalsTitle}>Что учитывается в сигналах</Text>
          <View style={styles.signals}>
            {overview.signals.map((line, i) => (
              <View key={`${i}-${line.slice(0, 20)}`} style={styles.signalRow}>
                <View style={styles.dot} />
                <Text style={styles.signalText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {showActionBridge ? (
        <Text style={styles.bridge}>{OVERVIEW_TO_ACTION_BRIDGE}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(248,250,252,0.58)",
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "rgba(148,163,184,0.95)",
  },
  lead: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.15,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: 2,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 2,
  },
  explainBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148,163,184,0.28)",
    gap: 6,
  },
  explainTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.35,
    color: colors.textMuted,
    marginBottom: 2,
  },
  explainLine: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    opacity: 0.95,
  },
  signalsSection: {
    marginTop: spacing.xs,
  },
  signalsTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.35,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  signals: {
    gap: spacing.xs,
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(100,116,139,0.4)",
    marginTop: 6,
  },
  signalText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  bridge: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: spacing.sm,
    opacity: 0.88,
  },
});

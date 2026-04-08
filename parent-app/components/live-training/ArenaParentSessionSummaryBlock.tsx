import { View, Text, StyleSheet } from "react-native";
import { GlassCardV2 } from "@/components/ui";
import { colors, spacing, typography } from "@/constants/theme";
import type { ArenaParentProgressState, ArenaParentSummary } from "@/types/arenaParentSummary";

type Props = {
  summary: ArenaParentSummary;
};

function accentForState(state: ArenaParentProgressState): {
  glow: boolean;
  contentStyle?: object;
} {
  switch (state) {
    case "positive":
      return {
        glow: false,
        contentStyle: {
          borderLeftWidth: 3,
          borderLeftColor: "rgba(57, 217, 138, 0.4)",
          paddingLeft: spacing.sm,
        },
      };
    case "attention":
      return {
        glow: false,
        contentStyle: {
          borderLeftWidth: 3,
          borderLeftColor: "rgba(245, 158, 11, 0.5)",
          paddingLeft: spacing.sm,
        },
      };
    case "mixed":
    default:
      return {
        glow: false,
        contentStyle: {
          borderLeftWidth: 2,
          borderLeftColor: "rgba(148, 163, 184, 0.35)",
          paddingLeft: spacing.sm,
        },
      };
  }
}

/** Сессионная сводка Arena над списком наблюдений (без рекомендаций). */
export function ArenaParentSessionSummaryBlock({ summary }: Props) {
  const { glow, contentStyle } = accentForState(summary.progressState);

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.kicker}>Общая картина</Text>
      <GlassCardV2 variant="default" padding="sm" glow={glow} contentStyle={contentStyle}>
        <Text style={styles.title} numberOfLines={3}>
          {summary.summaryTitle}
        </Text>
        <Text style={styles.body} numberOfLines={6}>
          {summary.summaryText}
        </Text>
      </GlassCardV2>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    alignSelf: "stretch",
  },
  kicker: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.xs,
    opacity: 0.9,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});

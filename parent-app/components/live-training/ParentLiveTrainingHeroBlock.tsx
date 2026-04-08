import { View, Text, StyleSheet } from "react-native";
import { GlassCardV2 } from "@/components/ui";
import { colors, spacing, typography } from "@/constants/theme";
import type { ArenaParentSummary } from "@/types/arenaParentSummary";
import type { ArenaParentGuidance } from "@/types/arenaParentGuidance";

export type ParentLiveTrainingHeroUiState = "positive" | "mixed" | "attention";

type Props = {
  summary: ArenaParentSummary | null;
  guidance: ArenaParentGuidance | null;
  /** Когда нет Arena-сводки: одна строка из опубликованного отчёта (без новых API). */
  fallbackLine?: string | null;
};

function deriveHeroState(
  summary: ArenaParentSummary | null,
  guidance: ArenaParentGuidance | null,
  hasFallback: boolean
): ParentLiveTrainingHeroUiState {
  const ps = summary?.progressState;
  const gl = guidance?.guidanceLevel;
  if (ps === "attention" || gl === "important") return "attention";
  if (ps === "mixed" || gl === "focus") return "mixed";
  if (ps === "positive" || gl === "light") return "positive";
  if (hasFallback) return "mixed";
  return "mixed";
}

function statePillLabel(state: ParentLiveTrainingHeroUiState): string {
  switch (state) {
    case "attention":
      return "Внимание";
    case "mixed":
      return "Смешанно";
    case "positive":
    default:
      return "Позитив";
  }
}

function cardAccent(state: ParentLiveTrainingHeroUiState): object | undefined {
  switch (state) {
    case "attention":
      return {
        borderLeftWidth: 3,
        borderLeftColor: "rgba(245, 158, 11, 0.5)",
        paddingLeft: spacing.sm,
      };
    case "mixed":
      return {
        borderLeftWidth: 2,
        borderLeftColor: "rgba(148, 163, 184, 0.35)",
        paddingLeft: spacing.sm,
      };
    case "positive":
    default:
      return {
        borderLeftWidth: 3,
        borderLeftColor: "rgba(57, 217, 138, 0.38)",
        paddingLeft: spacing.sm,
      };
  }
}

function shouldShowOrientir(summary: ArenaParentSummary, guidance: ArenaParentGuidance): boolean {
  const g = guidance.guidanceText.trim();
  if (!g) return false;
  const sample = g.slice(0, Math.min(52, g.length));
  if (sample.length < 10) return !summary.summaryText.includes(g);
  return !summary.summaryText.includes(sample);
}

/** Верхняя сводка по живой тренировке: состояние, краткая сводка, короткий ориентир. */
export function ParentLiveTrainingHeroBlock({ summary, guidance, fallbackLine }: Props) {
  const fb = fallbackLine?.trim() ?? "";
  if (!summary && !guidance && !fb) return null;

  const state = deriveHeroState(summary, guidance, Boolean(fb));
  const glow = state === "attention";

  let headline = "";
  let body = "";
  let orientir: string | null = null;

  if (summary) {
    headline = summary.summaryTitle;
    body = summary.summaryText;
    if (guidance && shouldShowOrientir(summary, guidance)) {
      orientir = guidance.guidanceText.trim();
    }
  } else if (guidance) {
    headline = guidance.guidanceTitle;
    body = guidance.guidanceText;
  } else {
    headline = "Сводка";
    body = fb;
  }

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.kicker}>Сводка по тренировке</Text>
      <GlassCardV2
        variant="default"
        padding="md"
        glow={glow}
        contentStyle={cardAccent(state)}
      >
        <View style={[styles.pill, state === "attention" && styles.pillAttention, state === "mixed" && styles.pillMixed]}>
          <Text
            style={[
              styles.pillText,
              state === "attention" && styles.pillTextAttention,
              state === "positive" && styles.pillTextPositive,
            ]}
          >
            {statePillLabel(state)}
          </Text>
        </View>
        <Text style={styles.headline} numberOfLines={2}>
          {headline}
        </Text>
        <Text style={styles.body} numberOfLines={3}>
          {body}
        </Text>
        {orientir ? (
          <>
            <Text style={styles.signalKicker}>Ориентир</Text>
            <Text style={styles.orientir} numberOfLines={2}>
              {orientir}
            </Text>
          </>
        ) : null}
      </GlassCardV2>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
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
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148, 163, 184, 0.35)",
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    marginBottom: spacing.sm,
  },
  pillAttention: {
    borderColor: "rgba(245, 158, 11, 0.45)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  pillMixed: {
    borderColor: "rgba(148, 163, 184, 0.4)",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  pillTextAttention: {
    color: colors.warning,
  },
  pillTextPositive: {
    color: colors.textSecondary,
  },
  headline: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  signalKicker: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  orientir: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});

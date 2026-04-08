import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ArenaSummaryNextStepChip } from "@/components/arena/ArenaSummaryNextStepChip";
import { colors, spacing, radius, shadows, typography, sectionIcon } from "@/constants/theme";
import type { ArenaSummarySurfaceView } from "@/services/arenaExternalTrainingService";
import {
  ARENA_BRAND_KICKER_TYPO,
  ARENA_EXPLAIN_TYPO,
  ARENA_STATE_PILL_TYPO,
  ARENA_SUMMARY_CARD_BG,
  ARENA_SUMMARY_DIVIDER_RGBA,
  ARENA_SUMMARY_TONE_PALETTE,
  ARENA_SURFACE_COPY,
  clampArenaSummaryText,
  sliceArenaExplanationPoints,
} from "@/lib/arenaSummaryPresentation";

type Props = {
  surface: ArenaSummarySurfaceView;
  onOpenProfile: () => void;
};

/**
 * Главная: entry-сводка Арены — та же система, что на профиле, компактнее и с CTA в профиль.
 */
export function HomeArenaEntryBlock({ surface, onOpenProfile }: Props) {
  const tone = ARENA_SUMMARY_TONE_PALETTE[surface.stateTone];
  const summary = clampArenaSummaryText(surface.summary, "home");
  const explain = sliceArenaExplanationPoints(surface.explanationPoints, "home");

  return (
    <View style={styles.outer} accessibilityRole="text">
      <LinearGradient
        colors={[tone.glow[0], tone.glow[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glow}
      />
      <View style={styles.card}>
        <Text style={styles.kicker}>{ARENA_SURFACE_COPY.brandKicker}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {surface.title}
        </Text>
        <View
          style={[
            styles.pill,
            { backgroundColor: tone.pillBg, borderColor: tone.pillBorder },
          ]}
        >
          <Text
            style={[styles.pillText, { color: tone.pillText }]}
            numberOfLines={2}
          >
            {surface.stateLabel}
          </Text>
        </View>
        {summary ? <Text style={styles.summary}>{summary}</Text> : null}
        {explain.length > 0 ? (
          <View style={styles.explainWrap}>
            {explain.map((line, i) => (
              <Text key={`h-${i}-${line.slice(0, 10)}`} style={styles.explainLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {surface.nextStepLabel ? (
          <ArenaSummaryNextStepChip label={surface.nextStepLabel} variant="compact" />
        ) : null}
        <Pressable
          onPress={onOpenProfile}
          accessibilityRole="button"
          accessibilityLabel={ARENA_SURFACE_COPY.homeCtaA11yLabel}
          style={({ pressed }) => [styles.ctaRow, pressed && { opacity: 0.88 }]}
        >
          <Text style={styles.ctaText}>{ARENA_SURFACE_COPY.homeCta}</Text>
          <Ionicons name="chevron-forward" size={18} color={sectionIcon.color} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.level1,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
    backgroundColor: ARENA_SUMMARY_CARD_BG,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 2,
    gap: spacing.xs,
  },
  kicker: {
    ...ARENA_BRAND_KICKER_TYPO,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  pill: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingVertical: ARENA_STATE_PILL_TYPO.paddingVerticalCompact,
    paddingHorizontal: ARENA_STATE_PILL_TYPO.paddingHorizontal,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
  },
  pillText: {
    fontSize: ARENA_STATE_PILL_TYPO.fontSize,
    fontWeight: ARENA_STATE_PILL_TYPO.fontWeight,
    letterSpacing: ARENA_STATE_PILL_TYPO.letterSpacing,
  },
  summary: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  explainWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ARENA_SUMMARY_DIVIDER_RGBA,
  },
  explainLine: {
    fontSize: ARENA_EXPLAIN_TYPO.fontSize,
    lineHeight: ARENA_EXPLAIN_TYPO.lineHeight,
    color: colors.textMuted,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ARENA_SUMMARY_DIVIDER_RGBA,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "700",
    color: sectionIcon.color,
    letterSpacing: -0.2,
  },
});

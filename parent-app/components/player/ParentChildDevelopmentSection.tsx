import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SectionCard } from "@/components/player-passport";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import type { ParentPlayerDevelopmentSummary } from "@/services/playerService";
import { PLAYER_PROFILE_COPY } from "@/lib/parentPlayerProfileUi";

type Props = {
  summary: ParentPlayerDevelopmentSummary | null;
};

/**
 * Родительская сводка развития: только человеческий текст с сервера, без внутренних терминов.
 */
export function ParentChildDevelopmentSection({ summary }: Props) {
  const copy = PLAYER_PROFILE_COPY;
  const simple =
    summary?.simpleSummary?.trim() ||
    "Как только появятся записи после тренировок, здесь будет короткая спокойная сводка — без оценок и сравнений.";

  const focusItems = summary?.mainFocus?.filter((x) => x.trim()) ?? [];
  const trend = summary?.positiveTrend?.trim();
  const attention = summary?.attentionArea?.trim();

  return (
    <SectionCard
      title={copy.childDevelopmentTitle}
      subtitle={copy.childDevelopmentSubtitle}
      style={styles.sectionCard}
    >
      <View style={styles.body}>
        <Text style={styles.summaryPrimary}>{simple}</Text>
        {trend ? (
          <Text style={styles.summarySecondary} accessibilityRole="text">
            {trend}
          </Text>
        ) : null}

        {focusItems.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.kicker}>Сейчас в фокусе тренировок</Text>
            {focusItems.map((line, i) => (
              <Text key={`f-${i}`} style={styles.bullet}>
                · {line}
              </Text>
            ))}
          </View>
        ) : null}

        {attention ? (
          <View style={styles.attentionWrap}>
            <Text style={styles.attentionText}>{attention}</Text>
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: colors.surfaceLevel1,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
    marginBottom: spacing.md,
  },
  body: {
    gap: spacing.md,
  },
  summaryPrimary: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: 0.1,
  },
  summarySecondary: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  block: {
    gap: 6,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    paddingLeft: 2,
  },
  attentionWrap: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel1Border,
  },
  attentionText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});

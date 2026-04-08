import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { colors, spacing, textOnGlass, typography } from "@/constants/theme";
import type { ParentEngagementSummary } from "@/services/playerService";
import { PLAYER_PROFILE_COPY } from "@/lib/parentPlayerProfileUi";

const FALLBACK: ParentEngagementSummary = {
  encouragementLine:
    "Заглядывайте сюда после тренировок — мы держим тон спокойным, без сравнений и гонки за баллами.",
};

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

type Props = {
  engagement: ParentEngagementSummary | null;
};

/**
 * Компактный «крючок» удержания: заголовок + основная поддерживающая строка + опционально следующий шаг.
 */
export function ParentEngagementCompactSection({ engagement }: Props) {
  const copy = PLAYER_PROFILE_COPY;
  const e = engagement ?? FALLBACK;
  const headline = e.recentFocusHeadline?.trim();
  const progress = e.progressCue?.trim();
  const next = e.nextAttentionCue?.trim();
  const support = e.encouragementLine?.trim() || FALLBACK.encouragementLine;

  const mainLine = progress || support;
  const footLine =
    progress && support.trim() && norm(support) !== norm(mainLine) ? support : null;

  const showNext =
    Boolean(next) &&
    norm(next!) !== norm(headline ?? "") &&
    norm(next!) !== norm(mainLine);

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{copy.engagementTitle}</Text>
      <Text style={styles.subEyebrow}>{copy.engagementSubtitle}</Text>
      <GlassSurface variant="small" textComfortTint style={styles.card}>
        <View style={styles.inner}>
          {headline ? (
            <Text style={styles.headline} numberOfLines={3}>
              {headline}
            </Text>
          ) : null}
          <Text style={styles.mainCue} numberOfLines={4}>
            {mainLine}
          </Text>
          {showNext ? (
            <Text style={styles.nextCue} numberOfLines={3}>
              {next}
            </Text>
          ) : null}
          {footLine ? (
            <Text style={styles.footCue} numberOfLines={2}>
              {footLine}
            </Text>
          ) : null}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  subEyebrow: {
    fontSize: 13,
    lineHeight: 18,
    color: textOnGlass.meta,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  card: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: "hidden",
  },
  inner: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  headline: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    color: textOnGlass.heading,
  },
  mainCue: {
    fontSize: 14,
    lineHeight: 21,
    color: textOnGlass.body,
  },
  nextCue: {
    fontSize: 13,
    lineHeight: 19,
    color: textOnGlass.secondary,
    fontStyle: "italic",
  },
  footCue: {
    fontSize: 12,
    lineHeight: 17,
    color: textOnGlass.meta,
    marginTop: 2,
  },
});

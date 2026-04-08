import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SectionCard } from "@/components/player-passport";
import { colors, spacing, shadows } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type {
  ParentConnectionCue,
  ParentEmotionalInsight,
  ParentProgressNarrative,
} from "@/services/playerService";
import { PLAYER_PROFILE_COPY } from "@/lib/parentPlayerProfileUi";

const FALLBACK_BODY =
  "Здесь будет короткая история по записям после тренировок — спокойно, без баллов и без сравнения с другими детьми.";

type Props = {
  narrative: ParentProgressNarrative | null;
  /** Короткие строки поддержки с сервера — без отдельной «карточки». */
  emotional?: ParentEmotionalInsight | null;
  /** Опциональная связь с линией тренера — без призыва писать в чат. */
  connectionCue?: ParentConnectionCue | null;
};

/**
 * Связный мини-рассказ о прогрессе — дополняет «Сейчас важно» и блок развития, не дублируя сырой отчёт.
 */
export function ParentProgressNarrativeSection({
  narrative,
  emotional,
  connectionCue,
}: Props) {
  const copy = PLAYER_PROFILE_COPY;
  const body = narrative?.body?.trim() || FALLBACK_BODY;
  const headline = narrative?.headline?.trim();
  const continuing = narrative?.continuingFocus?.trim();
  const stabilizing = narrative?.stabilizingArea?.trim();
  const emotionalLines = [
    emotional?.highlightMoment?.trim(),
    emotional?.growthSignal?.trim(),
    emotional?.encouragement?.trim(),
  ].filter(Boolean) as string[];
  const connectionLines = [
    connectionCue?.optionalReflection?.trim(),
    connectionCue?.optionalQuestion?.trim(),
  ].filter(Boolean) as string[];

  return (
    <SectionCard
      title={copy.progressNarrativeTitle}
      subtitle={copy.progressNarrativeSubtitle}
      style={styles.card}
    >
      <View style={styles.inner}>
        {headline ? (
          <Text style={styles.headline} numberOfLines={2}>
            {headline}
          </Text>
        ) : null}
        <Text style={styles.body}>{body}</Text>
        {continuing ? (
          <View style={styles.extraBlock}>
            <Text style={styles.extraLabel}>{copy.progressNarrativeContinuingLabel}</Text>
            <Text style={styles.extraText} numberOfLines={4}>
              {continuing}
            </Text>
          </View>
        ) : null}
        {stabilizing ? (
          <View style={styles.extraBlock}>
            <Text style={styles.extraLabel}>{copy.progressNarrativeStabilizingLabel}</Text>
            <Text style={styles.extraText} numberOfLines={4}>
              {stabilizing}
            </Text>
          </View>
        ) : null}
        {emotionalLines.length > 0 ? (
          <View style={styles.emotionalWrap}>
            {emotionalLines.map((line, i) => (
              <Text
                key={`${i}-${line.slice(0, 24)}`}
                style={styles.emotionalLine}
                numberOfLines={3}
              >
                {line}
              </Text>
            ))}
          </View>
        ) : null}
        {connectionLines.length > 0 ? (
          <View style={styles.connectionWrap}>
            <View style={styles.connectionIconRow}>
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text style={styles.connectionEyebrow}>По желанию</Text>
            </View>
            {connectionLines.map((line, i) => (
              <Text
                key={`c-${i}-${line.slice(0, 24)}`}
                style={styles.connectionLine}
                numberOfLines={3}
              >
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderColor: colors.surfaceLevel1Border,
    ...shadows.level1,
    marginBottom: spacing.md,
  },
  inner: {
    gap: spacing.md,
  },
  headline: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  extraBlock: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceLevel2Border,
    gap: 4,
  },
  extraLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  extraText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  emotionalWrap: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceLevel2Border,
    gap: 6,
  },
  emotionalLine: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  connectionWrap: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceLevel2Border,
    gap: 6,
  },
  connectionIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  connectionEyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: colors.textMuted,
    opacity: 0.85,
  },
  connectionLine: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});

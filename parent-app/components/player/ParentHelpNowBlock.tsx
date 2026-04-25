/**
 * PHASE 6 Step 14: компактные подсказки «дома / вне льда» из SessionMeaning (GET latest-training-summary).
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/player/SectionCard";
import { colors, spacing, typography } from "@/constants/theme";

const MAX_LINES = 3;

function recommendationsWordRu(n: number): string {
  const k = Math.abs(n) % 100;
  const j = k % 10;
  if (k >= 11 && k <= 14) return "рекомендаций";
  if (j === 1) return "рекомендация";
  if (j >= 2 && j <= 4) return "рекомендации";
  return "рекомендаций";
}

export function ParentHelpNowBlock({ lines }: { lines: string[] }) {
  const cleaned = lines.filter((s) => s.trim().length > 0);
  const show = cleaned.slice(0, MAX_LINES);
  const moreCount = Math.max(0, cleaned.length - show.length);
  if (show.length === 0) return null;
  return (
    <SectionCard
      title="Как помочь сейчас"
      subtitle="Идеи для дома и вне льда по итогам последней тренировки."
      style={styles.card}
      contentDensity="compact"
    >
      {show.map((line, i) => (
        <View key={`hn-${i}`} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.line}>{line}</Text>
        </View>
      ))}
      {moreCount > 0 ? (
        <Text style={styles.moreHint} accessibilityRole="text">
          Ещё {moreCount} {recommendationsWordRu(moreCount)}
        </Text>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    ...typography.body,
    fontSize: 15,
    color: colors.accent,
    marginTop: 1,
  },
  line: {
    ...typography.body,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  moreHint: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
    marginLeft: 22,
  },
});

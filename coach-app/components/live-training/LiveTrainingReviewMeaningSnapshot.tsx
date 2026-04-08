/**
 * Компактный read-only срез `sessionMeaningJson` на экране review (те же поля, что live HUD).
 * Без клиентских расчётов — только отображение уже распарсенного GET session.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { theme } from "@/constants/theme";
import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import type { LiveTrainingSessionMeaning } from "@/types/liveTraining";

export function LiveTrainingReviewMeaningSnapshot({
  meaning,
}: {
  meaning: LiveTrainingSessionMeaning | null | undefined;
}) {
  const { topicsLine, playersLine } = useMemo(() => {
    if (!meaning) return { topicsLine: "", playersLine: "" };
    const fromThemes = [...meaning.themes]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((t) => formatLiveTrainingMetricDomain(t.key));
    const topics = fromThemes.length
      ? fromThemes.join(" · ")
      : [...meaning.focus]
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 3)
          .map((f) => formatLiveTrainingMetricDomain(f.label))
          .filter(Boolean)
          .join(" · ");
    const players = [...meaning.players]
      .map((p) => ({
        name: p.playerName.trim(),
        total: p.positiveCount + p.negativeCount + p.neutralCount,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
      .map((p) => p.name)
      .filter(Boolean)
      .join(", ");
    return { topicsLine: topics, playersLine: players };
  }, [meaning]);

  if (!topicsLine.trim() && !playersLine.trim()) return null;

  return (
    <GlassCardV2 padding="sm" style={styles.card}>
      <Text style={styles.kicker}>Смысл сессии</Text>
      {topicsLine.trim() ? (
        <Text style={styles.line} numberOfLines={2}>
          Темы: {topicsLine}
        </Text>
      ) : null}
      {playersLine.trim() ? (
        <Text style={styles.lineMuted} numberOfLines={2}>
          В фокусе: {playersLine}
        </Text>
      ) : null}
    </GlassCardV2>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.sm,
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 6,
    fontWeight: "600",
  },
  line: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  lineMuted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});

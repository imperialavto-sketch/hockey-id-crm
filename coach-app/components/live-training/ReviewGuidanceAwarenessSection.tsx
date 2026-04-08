import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { theme } from "@/constants/theme";
import {
  LIVE_GUIDANCE_AWARENESS_COPY,
  type LiveGuidanceAwarenessDto,
  type LiveGuidanceAwarenessStatus,
} from "@/lib/liveTrainingGuidanceAwareness";

type Props = {
  model: LiveGuidanceAwarenessDto;
};

function statusDotStyle(s: LiveGuidanceAwarenessStatus) {
  if (s === "seen") return styles.dotSeen;
  if (s === "uncertain") return styles.dotUncertain;
  return styles.dotNotSeen;
}

function statusLineRu(s: LiveGuidanceAwarenessStatus): string {
  const c = LIVE_GUIDANCE_AWARENESS_COPY;
  if (s === "seen") return c.seen;
  if (s === "uncertain") return c.uncertain;
  return c.notSeen;
}

export function ReviewGuidanceAwarenessSection({ model }: Props) {
  const c = LIVE_GUIDANCE_AWARENESS_COPY;
  if (!model.cues.length) return null;

  return (
    <GlassCardV2
      padding="lg"
      style={styles.card}
      contentStyle={{
        borderLeftWidth: 2,
        borderLeftColor: "rgba(255,255,255,0.14)",
        paddingLeft: theme.spacing.md,
      }}
    >
      <Text style={styles.title}>{c.sectionTitle}</Text>
      <Text style={styles.sub}>{c.sectionSub}</Text>
      {model.cues.map((row, i) => (
        <View key={`${i}-${row.title.slice(0, 24)}`} style={styles.row}>
          <View style={[styles.dot, statusDotStyle(row.status)]} />
          <View style={styles.rowText}>
            <Text style={styles.cueTitle} numberOfLines={2}>
              {row.title}
            </Text>
            <Text style={styles.statusHint}>{statusLineRu(row.status)}</Text>
          </View>
        </View>
      ))}
    </GlassCardV2>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  title: {
    ...theme.typography.subtitle,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  sub: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  dotSeen: {
    backgroundColor: "rgba(59, 130, 246, 0.55)",
  },
  dotUncertain: {
    backgroundColor: "rgba(120, 120, 128, 0.45)",
  },
  dotNotSeen: {
    backgroundColor: "rgba(120, 120, 128, 0.22)",
  },
  rowText: {
    flex: 1,
  },
  cueTitle: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text,
    marginBottom: 2,
  },
  statusHint: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
});

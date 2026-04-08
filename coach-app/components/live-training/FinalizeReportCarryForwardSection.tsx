import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { theme } from "@/constants/theme";
import {
  LIVE_TRAINING_FINALIZE_CARRY_FORWARD_COPY,
  type LiveTrainingFinalizeCarryForwardLineVm,
  type LiveTrainingFinalizeCarryForwardVm,
} from "@/lib/liveTrainingFinalizeCarryForwardViewModel";

type Props = {
  model: LiveTrainingFinalizeCarryForwardVm;
};

function LineGroup({
  kicker,
  lines,
}: {
  kicker: string;
  lines: LiveTrainingFinalizeCarryForwardLineVm[];
}) {
  if (lines.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.blockKicker}>{kicker}</Text>
      {lines.map((item, i) => (
        <View key={i} style={styles.lineWrap}>
          <Text style={styles.lineStrong}>· {item.primary}</Text>
          {item.secondary ? <Text style={styles.lineMuted}>{item.secondary}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function ContextStrings({ kicker, lines }: { kicker: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.blockKicker}>{kicker}</Text>
      {lines.map((line, i) => (
        <Text key={i} style={styles.lineContext}>
          · {line.length > 220 ? `${line.slice(0, 217)}…` : line}
        </Text>
      ))}
    </View>
  );
}

export function FinalizeReportCarryForwardSection({ model }: Props) {
  const c = LIVE_TRAINING_FINALIZE_CARRY_FORWARD_COPY;
  const hasMain =
    model.worthRechecking.length > 0 ||
    model.possibleCarryForward.length > 0 ||
    model.optionalContextOnly.length > 0;

  if (!hasMain) return null;

  const showEmptyHint =
    model.worthRechecking.length === 0 &&
    model.possibleCarryForward.length === 0 &&
    model.optionalContextOnly.length > 0;

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

      <LineGroup kicker={c.worthKicker} lines={model.worthRechecking} />
      <LineGroup kicker={c.carryKicker} lines={model.possibleCarryForward} />
      <ContextStrings kicker={c.contextKicker} lines={model.optionalContextOnly} />

      {showEmptyHint ? <Text style={styles.emptyHint}>{c.emptyGroupHint}</Text> : null}

      <View style={styles.hints}>
        <Text style={styles.hintLine}>{c.hintObservations}</Text>
        <Text style={styles.hintLine}>{c.hintCycle}</Text>
      </View>
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
  block: {
    marginBottom: 12,
  },
  blockKicker: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  lineWrap: {
    marginBottom: 8,
  },
  lineStrong: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  lineMuted: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginLeft: 10,
  },
  lineContext: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  emptyHint: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 8,
  },
  hints: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  hintLine: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 6,
  },
});

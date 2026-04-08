import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { theme } from "@/constants/theme";
import {
  LIVE_TRAINING_REVIEW_REPORT_PLANNING_COPY,
  type LiveTrainingReviewReportPlanningVm,
} from "@/lib/liveTrainingReviewReportPlanningContext";

type Props = {
  model: LiveTrainingReviewReportPlanningVm;
};

function LineBlock({
  kicker,
  lines,
}: {
  kicker: string;
  lines: Array<{ primary: string; secondary?: string } | string>;
}) {
  if (lines.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.blockKicker}>{kicker}</Text>
      {lines.map((item, i) => {
        if (typeof item === "string") {
          return (
            <Text key={i} style={styles.line}>
              · {item.length > 220 ? `${item.slice(0, 217)}…` : item}
            </Text>
          );
        }
        return (
          <View key={i} style={styles.lineWrap}>
            <Text style={styles.lineStrong}>· {item.primary}</Text>
            {item.secondary ? <Text style={styles.lineMuted}>{item.secondary}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

export function ReviewReportPlanningContextSection({ model }: Props) {
  const c = LIVE_TRAINING_REVIEW_REPORT_PLANNING_COPY;

  const seedStrings = model.seedLines;

  return (
    <GlassCardV2
      padding="lg"
      style={styles.card}
      contentStyle={{
        borderLeftWidth: 2,
        borderLeftColor: "rgba(74, 158, 255, 0.45)",
        paddingLeft: theme.spacing.md,
      }}
    >
      <Text style={styles.title}>{c.sectionTitle}</Text>
      <Text style={styles.sub}>{c.sectionSub}</Text>

      {seedStrings.length > 0 ? (
        <LineBlock kicker={c.seedsKicker} lines={seedStrings} />
      ) : null}

      {model.focusFromReports.length > 0 ? (
        <LineBlock kicker={c.focusKicker} lines={model.focusFromReports} />
      ) : null}

      {model.reinforceFromReports.length > 0 ? (
        <LineBlock kicker={c.reinforceKicker} lines={model.reinforceFromReports} />
      ) : null}

      {model.reportSummaryLines.length > 0 ? (
        <LineBlock kicker={c.summaryKicker} lines={model.reportSummaryLines} />
      ) : null}

      <View style={styles.hints}>
        <Text style={styles.hintLine}>{c.hintCompare}</Text>
        <Text style={styles.hintLine}>{c.hintReport}</Text>
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
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  sub: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  block: {
    marginBottom: 12,
  },
  blockKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  line: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginBottom: 4,
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
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginLeft: 10,
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

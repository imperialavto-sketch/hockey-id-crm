import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ArenaHomeMetric, ArenaMetricTrend } from "@/lib/parentArenaHomeModel";
import { spacing, radius } from "@/constants/theme";

function TrendGlyph({ trend }: { trend: ArenaMetricTrend }) {
  if (trend === "neutral") {
    return <View style={[styles.dot, styles.dotNeutral]} />;
  }
  if (trend === "steady") {
    return <View style={[styles.dot, styles.dotSteady]} />;
  }
  if (trend === "up") {
    return (
      <View style={styles.trendUp}>
        <View style={styles.trendUpBar} />
      </View>
    );
  }
  return (
    <View style={styles.trendDown}>
      <View style={styles.trendDownBar} />
    </View>
  );
}

export const ArenaMetricTile = memo(function ArenaMetricTile({
  metric,
  supporting = false,
}: {
  metric: ArenaHomeMetric;
  /** Вторичный слой под графиком — тише, компактнее */
  supporting?: boolean;
}) {
  return (
    <View
      style={[styles.wrap, supporting && styles.wrapSupporting]}
      accessibilityRole="summary"
    >
      <Text
        style={[styles.label, supporting && styles.labelSupporting]}
        numberOfLines={1}
      >
        {metric.label}
      </Text>
      <View style={styles.row}>
        <Text
          style={[styles.value, supporting && styles.valueSupporting]}
          numberOfLines={1}
        >
          {metric.valueLabel}
        </Text>
        <TrendGlyph trend={metric.trend} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "rgba(12, 40, 72, 0.45)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(160, 210, 255, 0.18)",
  },
  wrapSupporting: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: "rgba(8, 26, 52, 0.5)",
    borderColor: "rgba(150, 200, 248, 0.14)",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: "rgba(186, 218, 255, 0.62)",
    marginBottom: 4,
  },
  labelSupporting: {
    fontSize: 9,
    marginBottom: 2,
    color: "rgba(190, 218, 250, 0.58)",
    letterSpacing: 0.32,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(245, 251, 255, 0.95)",
    letterSpacing: -0.2,
  },
  valueSupporting: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(240, 248, 255, 0.9)",
    letterSpacing: -0.18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotNeutral: {
    backgroundColor: "rgba(148, 180, 220, 0.35)",
  },
  dotSteady: {
    backgroundColor: "rgba(125, 211, 252, 0.65)",
  },
  trendUp: {
    width: 10,
    height: 10,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  trendUpBar: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(52, 211, 153, 0.85)",
  },
  trendDown: {
    width: 10,
    height: 10,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  trendDownBar: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(251, 191, 36, 0.75)",
  },
});

import React, { memo } from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { radius, spacing, textOnGlass, typography } from "@/constants/theme";

export type PlayerMetricTileTone = "default" | "supporting" | "success" | "accent";

/**
 * Arena-style metric tile for player detail screens (passport stats, dev summary, AI hero).
 * Visually aligned with {@link ArenaMetricTile} without coupling to home model types.
 */
export const PlayerMetricTile = memo(function PlayerMetricTile({
  label,
  value,
  tone = "default",
  fullWidth,
  style,
}: {
  label: string;
  value: string;
  tone?: PlayerMetricTileTone;
  /** Single-column stack (e.g. development plan summary). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const supporting = tone === "supporting";
  const success = tone === "success";
  const accent = tone === "accent";

  return (
    <View
      style={[
        styles.wrap,
        fullWidth && styles.wrapFull,
        supporting && styles.wrapSupporting,
        success && styles.wrapSuccess,
        accent && styles.wrapAccent,
        style,
      ]}
      accessibilityRole="summary"
    >
      <Text
        style={[styles.label, supporting && styles.labelSupporting]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text
        style={[styles.value, supporting && styles.valueSupporting, success && styles.valueSuccess]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
});

/** Compact ice row for bullet lists (AI analysis sections). */
export function PlayerIceListRow({
  children,
  last,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return <View style={[styles.listRow, last && styles.listRowLast]}>{children}</View>;
}

const ICE_BG = "rgba(12, 40, 72, 0.48)";
const ICE_BORDER = "rgba(160, 210, 255, 0.2)";
const ICE_BG_SUPPORT = "rgba(8, 26, 52, 0.52)";
const ICE_BORDER_SUPPORT = "rgba(150, 200, 248, 0.16)";

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: "42%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: ICE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ICE_BORDER,
  },
  wrapFull: {
    flexBasis: "100%",
    maxWidth: "100%",
    minWidth: "100%",
  },
  wrapSupporting: {
    paddingVertical: spacing.sm,
    backgroundColor: ICE_BG_SUPPORT,
    borderColor: ICE_BORDER_SUPPORT,
  },
  wrapSuccess: {
    borderColor: "rgba(57, 217, 138, 0.35)",
    backgroundColor: "rgba(16, 48, 36, 0.35)",
  },
  wrapAccent: {
    borderColor: "rgba(96, 165, 250, 0.35)",
    backgroundColor: "rgba(30, 58, 120, 0.35)",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: "rgba(186, 218, 255, 0.62)",
    marginBottom: 6,
  },
  labelSupporting: {
    fontSize: 9,
    marginBottom: 4,
    letterSpacing: 0.32,
  },
  value: {
    ...typography.cardTitle,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.25,
    color: textOnGlass.heading,
  },
  valueSupporting: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(240, 248, 255, 0.92)",
  },
  valueSuccess: {
    color: textOnGlass.heading,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: ICE_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ICE_BORDER,
  },
  listRowLast: {
    marginBottom: 0,
  },
});

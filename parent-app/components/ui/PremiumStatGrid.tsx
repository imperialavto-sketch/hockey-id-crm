import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
import { colors, spacing, typography } from "@/constants/theme";

export interface StatItem {
  value: string;
  label: string;
  accent?: boolean;
}

type Props = {
  stats: StatItem[];
};

const EASE = Easing.out(Easing.cubic);

/**
 * Premium stat blocks — clean grid, equal size, large number, small label.
 */
export function PremiumStatGrid({ stats }: Props) {
  return (
    <View style={styles.grid}>
      {stats.map((s, i) => (
        <Animated.View
          key={s.label}
          entering={FadeInUp.delay(160 + i * 40).duration(380).easing(EASE)}
          style={[styles.block, s.accent && styles.blockAccent]}
        >
          <View style={styles.blockInner}>
            <Text style={[styles.value, s.accent && styles.valueAccent]}>
              {s.value}
            </Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  block: {
    flex: 1,
    minWidth: 72,
    minHeight: 80,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  blockAccent: {
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  blockInner: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.8,
  },
  valueAccent: {
    color: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
});

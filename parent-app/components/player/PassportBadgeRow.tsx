import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

interface PassportBadgeRowProps {
  badges: string[];
  /** Optional accent badges (e.g. Verified) */
  accent?: string[];
}

/**
 * Row of premium badges for passport.
 */
export function PassportBadgeRow({ badges, accent = [] }: PassportBadgeRowProps) {
  const all = [...accent, ...badges].filter(Boolean);
  if (all.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.wrap}
    >
      {all.map((b, i) => (
        <View
          key={i}
          style={[
            styles.badge,
            accent.includes(b) && styles.badgeAccent,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              accent.includes(b) && styles.badgeTextAccent,
            ]}
          >
            {b}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  badgeAccent: {
    backgroundColor: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.25)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
  },
  badgeTextAccent: {
    color: colors.accentSecondary,
  },
});

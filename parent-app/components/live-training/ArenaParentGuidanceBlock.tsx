import { View, Text, StyleSheet } from "react-native";
import { GlassCardV2 } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import type { ArenaParentGuidance, ArenaParentGuidanceLevel } from "@/types/arenaParentGuidance";

type Props = {
  guidance: ArenaParentGuidance;
};

function accentForLevel(level: ArenaParentGuidanceLevel): { glow: boolean; contentStyle?: object } {
  switch (level) {
    case "light":
      return {
        glow: false,
        contentStyle: {
          borderLeftWidth: 2,
          borderLeftColor: "rgba(148, 163, 184, 0.28)",
          paddingLeft: spacing.sm,
        },
      };
    case "focus":
      return {
        glow: false,
        contentStyle: {
          borderLeftWidth: 3,
          borderLeftColor: "rgba(59, 130, 246, 0.38)",
          paddingLeft: spacing.sm,
        },
      };
    case "important":
    default:
      return {
        glow: false,
        contentStyle: {
          borderLeftWidth: 3,
          borderLeftColor: "rgba(245, 158, 11, 0.42)",
          paddingLeft: spacing.sm,
        },
      };
  }
}

/** Мягкий ориентир для родителя (не рекомендация и не инструкция). */
export function ArenaParentGuidanceBlock({ guidance }: Props) {
  const { glow, contentStyle } = accentForLevel(guidance.guidanceLevel);

  return (
    <View style={styles.wrap} accessibilityRole="text">
      <GlassCardV2 variant="default" padding="sm" glow={glow} contentStyle={contentStyle}>
        <Text style={styles.title} numberOfLines={3}>
          {guidance.guidanceTitle}
        </Text>
        <Text style={styles.body} numberOfLines={5}>
          {guidance.guidanceText}
        </Text>
      </GlassCardV2>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    alignSelf: "stretch",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});

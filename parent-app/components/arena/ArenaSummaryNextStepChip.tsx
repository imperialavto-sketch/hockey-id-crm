import { View, Text, StyleSheet } from "react-native";
import {
  ARENA_NEXT_STEP_SURFACE,
  ARENA_NEXT_STEP_TEXT,
  ARENA_SURFACE_COPY,
  arenaNextStepMetrics,
  type ArenaNextStepVariant,
} from "@/lib/arenaSummaryPresentation";

type Props = {
  label: string;
  variant: ArenaNextStepVariant;
};

/**
 * Общая грамматика «Следующий шаг» для home (compact) и player (expanded).
 */
export function ArenaSummaryNextStepChip({ label, variant }: Props) {
  const m = arenaNextStepMetrics(variant);
  const trimmed = label.trim();
  if (!trimmed) return null;

  return (
    <View
      style={[
        styles.wrap,
        {
          marginTop: m.marginTop,
          paddingVertical: m.paddingVertical,
          paddingHorizontal: m.paddingHorizontal,
          borderRadius: m.borderRadius,
          gap: m.gap,
        },
      ]}
      accessibilityRole="text"
    >
      <Text
        style={[
          styles.eyebrow,
          {
            fontSize: m.eyebrowFontSize,
            letterSpacing: m.eyebrowLetterSpacing,
            fontWeight: m.eyebrowFontWeight,
          },
        ]}
      >
        {ARENA_SURFACE_COPY.nextStepEyebrow}
      </Text>
      <Text
        style={[
          styles.value,
          {
            fontSize: m.valueFontSize,
            lineHeight: m.valueLineHeight,
            letterSpacing: m.valueLetterSpacing,
            fontWeight: m.valueFontWeight,
          },
        ]}
        numberOfLines={2}
      >
        {trimmed}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    backgroundColor: ARENA_NEXT_STEP_SURFACE.backgroundColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ARENA_NEXT_STEP_SURFACE.borderColor,
  },
  eyebrow: {
    textTransform: "uppercase",
    color: ARENA_NEXT_STEP_TEXT.eyebrow,
  },
  value: {
    color: ARENA_NEXT_STEP_TEXT.value,
  },
});

import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  lines: string[];
  /** Заголовок над строками (например в карточке опубликованного отчёта). */
  kicker?: string;
  /** Меньше отступы при встраивании под narrative отчёта. */
  embedded?: boolean;
};

/** Вторичный контекст по вниманию и организации на занятии (без чисел в тексте). */
export function ParentBehaviorHumanExplainability({
  lines,
  kicker,
  embedded,
}: Props) {
  if (!lines.length) return null;
  return (
    <View
      style={[styles.wrap, embedded && styles.wrapEmbedded]}
      accessibilityRole="text"
    >
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      {lines.map((line, i) => (
        <Text
          key={`pbh-${i}`}
          style={[styles.line, i > 0 && styles.lineGap]}
          numberOfLines={4}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  wrapEmbedded: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  kicker: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 6,
    opacity: 0.92,
  },
  line: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  lineGap: {
    marginTop: 6,
  },
});

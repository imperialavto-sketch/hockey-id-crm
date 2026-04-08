/**
 * STEP 23: компактный блок отзыва внешнего тренера (только чтение).
 */
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, cardShadow } from "@/constants/theme";

export type ParentExternalCoachFeedbackBlockProps = {
  coachName: string;
  summary: string;
  focusAreas: string[];
};

export function ParentExternalCoachFeedbackBlock({
  coachName,
  summary,
  focusAreas,
}: ParentExternalCoachFeedbackBlockProps) {
  const areas = focusAreas.filter((x) => x.trim()).slice(0, 3);
  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.kicker}>Что дал внешний тренер</Text>
      <Text style={styles.coachName} numberOfLines={2}>
        {coachName}
      </Text>
      <Text style={styles.summary} numberOfLines={8}>
        {summary}
      </Text>
      {areas.length > 0 ? (
        <>
          <Text style={styles.focusKicker}>В фокусе</Text>
          {areas.map((line, i) => (
            <Text key={`fb-f-${i}`} style={styles.focusLine} numberOfLines={2}>
              • {line}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  coachName: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  focusKicker: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  focusLine: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
});

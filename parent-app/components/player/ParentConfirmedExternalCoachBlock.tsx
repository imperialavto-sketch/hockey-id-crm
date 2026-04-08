/**
 * STEP 20: компактный блок подтверждённого тренером внешнего подбора (только чтение, без действий).
 */
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, cardShadow } from "@/constants/theme";

export type ParentConfirmedExternalCoachBlockProps = {
  coachName: string;
  skillsLine: string;
  reason: string;
};

export function ParentConfirmedExternalCoachBlock({
  coachName,
  skillsLine,
  reason,
}: ParentConfirmedExternalCoachBlockProps) {
  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.kicker}>Рекомендуем дополнительную работу</Text>
      <Text style={styles.coachName} numberOfLines={2}>
        {coachName}
      </Text>
      {skillsLine.trim() ? (
        <Text style={styles.skills} numberOfLines={3}>
          {skillsLine}
        </Text>
      ) : null}
      <Text style={styles.reason} numberOfLines={5}>
        {reason}
      </Text>
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
    marginBottom: 4,
  },
  skills: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  reason: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});

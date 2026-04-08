/**
 * STEP 24: компактно как повлияла доп. работа на следующую тренировку (только helped / no_clear_effect).
 */
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, cardShadow } from "@/constants/theme";

export type ParentExternalWorkImpactBlockProps = {
  status: "helped" | "no_clear_effect";
  note: string;
};

function statusLabel(status: ParentExternalWorkImpactBlockProps["status"]): string {
  if (status === "helped") return "Есть положительная динамика";
  return "Явного сдвига относительно прошлой тренировки не видно";
}

export function ParentExternalWorkImpactBlock({ status, note }: ParentExternalWorkImpactBlockProps) {
  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.kicker}>Как повлияла дополнительная работа</Text>
      <Text style={styles.statusLine}>{statusLabel(status)}</Text>
      <Text style={styles.note} numberOfLines={8}>
        {note}
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
  statusLine: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});

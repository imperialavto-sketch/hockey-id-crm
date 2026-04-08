import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import type { ExternalTrainingRequestView } from "@/services/arenaExternalTrainingService";

type Props = {
  view: ExternalTrainingRequestView;
};

/**
 * Read-only низкоприоритетный источник: внешний контур развития (без CTA и навигации).
 */
export function PlayerExternalTrainingSupplementBlock({ view }: Props) {
  const { sourceLayer } = view;
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.title}>Дополнительная работа</Text>
      <Text style={styles.label}>{sourceLayer.label}</Text>
      <Text style={styles.description}>{sourceLayer.description}</Text>
      <Text style={styles.footer}>
        Этот контур дополняет основную оценку игрока, но не заменяет данные школы.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel1Border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.level1,
    gap: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentBlue,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  footer: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
});

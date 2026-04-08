import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import type { ExternalTrainingReportView } from "@/services/arenaExternalTrainingService";

type Props = {
  view: ExternalTrainingReportView;
};

const KICKER = "Разбор от Арены";

export function PlayerExternalTrainingReportBlock({ view }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.kicker}>{KICKER}</Text>
      <Text style={styles.title}>Результат дополнительной работы</Text>
      <Text style={styles.summary}>{view.summary}</Text>

      {view.focusAreas.length > 0 ? (
        <View style={styles.chipsRow}>
          {view.focusAreas.map((line, i) => (
            <View key={`${i}-${line}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={2}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {view.resultNotes?.trim() ? (
        <Text style={styles.notes}>{view.resultNotes.trim()}</Text>
      ) : null}

      {view.nextSteps?.trim() ? (
        <View style={styles.nextBlock}>
          <Text style={styles.nextLabel}>Следующий фокус</Text>
          <Text style={styles.nextText}>{view.nextSteps.trim()}</Text>
        </View>
      ) : null}

      <Text style={styles.footer}>
        Этот результат учитывается как дополнительный источник и не заменяет основную
        оценку школы.
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
    gap: spacing.md,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: colors.textMuted,
    opacity: 0.88,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accentBlue,
  },
  notes: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  nextBlock: {
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceLevel2Border,
    gap: 4,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  nextText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
});

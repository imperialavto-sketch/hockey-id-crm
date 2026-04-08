import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import type { ExternalDevelopmentNarrativeView } from "@/services/arenaExternalTrainingService";

type Props = {
  narrative: ExternalDevelopmentNarrativeView;
};

export function PlayerExternalDevelopmentNarrativeBlock({ narrative }: Props) {
  const active = narrative.emphasis === "active";
  return (
    <View
      style={[styles.wrap, active ? styles.wrapActive : styles.wrapSubtle]}
      accessibilityRole="text"
    >
      <Text style={styles.title}>{narrative.title}</Text>
      <Text style={styles.summary}>{narrative.summary}</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{narrative.sourcePriorityLabel}</Text>
      </View>
      {narrative.keyPoints.length > 0 ? (
        <View style={styles.points}>
          {narrative.keyPoints.map((line, i) => (
            <View key={`${i}-${line.slice(0, 24)}`} style={styles.pointRow}>
              <Text style={styles.bullet}>·</Text>
              <Text style={styles.pointText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.level1,
  },
  wrapSubtle: {
    backgroundColor: "rgba(148,163,184,0.06)",
    borderColor: colors.surfaceLevel2Border,
  },
  wrapActive: {
    backgroundColor: "rgba(59,130,246,0.06)",
    borderColor: "rgba(59,130,246,0.22)",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(148,163,184,0.12)",
    marginBottom: spacing.sm,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  points: {
    gap: 4,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bullet: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    lineHeight: 19,
    width: 10,
    textAlign: "center",
  },
  pointText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
});

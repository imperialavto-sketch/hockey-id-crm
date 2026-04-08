import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import type { CoachTrainingSessionReportActionLayer } from "@/services/coachPlayersService";
import { COACH_PLAYER_DETAIL_COPY } from "@/lib/coachPlayerDetailUi";

type Props = {
  loading: boolean;
  actionLayer: CoachTrainingSessionReportActionLayer | null;
  /** Скрываем блок, если аналитика в ошибке (повтор — в секции выше). */
  hidden: boolean;
};

function confidenceLine(c: CoachTrainingSessionReportActionLayer["confidence"]): string {
  const copy = COACH_PLAYER_DETAIL_COPY;
  if (c === "low") return copy.reportNextStepsConfidenceLow;
  if (c === "high") return copy.reportNextStepsConfidenceHigh;
  return copy.reportNextStepsConfidenceModerate;
}

function Block({
  kicker,
  lines,
}: {
  kicker: string;
  lines: string[];
}) {
  if (lines.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.kicker}>{kicker}</Text>
      {lines.map((line, i) => (
        <View key={i} style={styles.lineRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.lineText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

export function CoachPlayerReportNextStepsSection({ loading, actionLayer, hidden }: Props) {
  const copy = COACH_PLAYER_DETAIL_COPY;

  if (hidden) return null;

  return (
    <DashboardSection title={copy.reportNextStepsTitle}>
      <Text style={styles.sectionSub}>{copy.reportNextStepsSub}</Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>{copy.reportNextStepsLoading}</Text>
          </View>
        ) : actionLayer ? (
          <View style={styles.inner}>
            <Text style={styles.confidenceHint}>{confidenceLine(actionLayer.confidence)}</Text>

            <Block kicker={copy.reportNextStepsPriorityKicker} lines={actionLayer.priorityActions} />
            {actionLayer.priorityActions.length > 0 ? <View style={styles.divider} /> : null}

            <Block kicker={copy.reportNextStepsReinforceKicker} lines={actionLayer.reinforcementAreas} />
            {actionLayer.reinforcementAreas.length > 0 ? <View style={styles.divider} /> : null}

            <Block kicker={copy.reportNextStepsSessionKicker} lines={actionLayer.nextSessionFocus} />

            {actionLayer.rationale && actionLayer.rationale.length > 0 ? (
              <>
                <View style={styles.divider} />
                <View style={styles.block}>
                  <Text style={styles.kicker}>{copy.reportNextStepsRationaleKicker}</Text>
                  {actionLayer.rationale.map((r, i) => (
                    <Text key={i} style={styles.rationaleLine}>
                      {r}
                    </Text>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  sectionSub: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  inner: {
    paddingHorizontal: theme.spacing.sm,
  },
  confidenceHint: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textMuted,
    marginBottom: 14,
    fontStyle: "italic",
  },
  block: {
    marginBottom: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  bullet: {
    color: theme.colors.primary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 1,
  },
  lineText: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: 14,
  },
  rationaleLine: {
    ...theme.typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
});

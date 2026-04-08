import React from "react";
import { StyleSheet, Text } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import type { CoachPlayerDevelopmentSummaryVm } from "@/lib/coachPlayerDevelopmentEvidence";

type Props = {
  summary: CoachPlayerDevelopmentSummaryVm;
};

export function CoachPlayerDevelopmentSummarySection({ summary }: Props) {
  return (
    <DashboardSection title="Развитие · кратко" style={styles.sectionWrap}>
      <Text style={styles.sectionSub}>
        По доменам из live training и возрастных ориентиров — без общей оценки.
      </Text>
      <SectionCard elevated style={styles.card}>
        {summary.summaryLines.map((line, i) => (
          <Text
            key={`${i}-${line.slice(0, 12)}`}
            style={[styles.line, i > 0 && styles.lineGap]}
            numberOfLines={4}
          >
            {line}
          </Text>
        ))}
      </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    marginBottom: theme.layout.sectionGap,
  },
  sectionSub: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    fontStyle: "italic",
  },
  card: {
    marginBottom: 0,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    backgroundColor: theme.colors.card,
  },
  line: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  lineGap: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});

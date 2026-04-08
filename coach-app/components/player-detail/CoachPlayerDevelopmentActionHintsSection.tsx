import React from "react";
import { StyleSheet, Text } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { theme } from "@/constants/theme";
import type { CoachPlayerDevelopmentActionHintsVm } from "@/lib/coachPlayerDevelopmentEvidence";

type Props = {
  hints: CoachPlayerDevelopmentActionHintsVm;
};

export function CoachPlayerDevelopmentActionHintsSection({ hints }: Props) {
  return (
    <DashboardSection title="Подсказки на тренировке" style={styles.sectionWrap}>
      <Text style={styles.sectionSub}>
        Короткие ориентиры по текущей сводке — не рекомендации и не оценка.
      </Text>
      <SectionCard elevated style={styles.card}>
        {hints.summaryHints.map((line, i) => (
          <Text
            key={`${i}-${line.slice(0, 16)}`}
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
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },
  line: {
    fontSize: 13,
    fontWeight: "400",
    fontStyle: "italic",
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  lineGap: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});

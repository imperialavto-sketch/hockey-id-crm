import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type { CoachPublishedSessionReportHistoryItem } from "@/services/coachPlayersService";
import { COACH_AUTH_REQUIRED_LINE, COACH_PLAYER_DETAIL_COPY } from "@/lib/coachPlayerDetailUi";

type Props = {
  loading: boolean;
  items: CoachPublishedSessionReportHistoryItem[];
  loadError: string | null;
  onOpenTraining: (trainingId: string) => void;
  onRetry: () => void;
};

function formatSessionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function sessionHeadline(it: CoachPublishedSessionReportHistoryItem): string {
  const date = formatSessionDate(it.sessionStartedAt);
  const team = it.teamName?.trim() || "Команда";
  const parts = [date, team, it.sessionKindLabel].filter(Boolean);
  return parts.join(" · ");
}

export function CoachPlayerPublishedSessionReportsSection({
  loading,
  items,
  loadError,
  onOpenTraining,
  onRetry,
}: Props) {
  const copy = COACH_PLAYER_DETAIL_COPY;

  return (
    <DashboardSection title={copy.publishedSessionReportsTitle}>
      <Text style={styles.sectionSub}>{copy.publishedSessionReportsSub}</Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>{copy.publishedSessionReportsLoading}</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errBlock}>
            <Text style={styles.errorText}>{loadError}</Text>
            {loadError !== COACH_AUTH_REQUIRED_LINE ? (
              <Text style={styles.hint}>{copy.networkRetryHint}</Text>
            ) : null}
            <PrimaryButton title={copy.retryCta} variant="outline" onPress={onRetry} style={styles.retryBtn} />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>{copy.publishedSessionReportsEmpty}</Text>
        ) : (
          items.map((it, idx) => (
            <PressableFeedback
              key={it.trainingId}
              hapticOnPress
              onPress={() => onOpenTraining(it.trainingId)}
              style={[styles.rowPress, idx > 0 && styles.rowDivider]}
            >
              <View style={styles.accent} />
              <View style={styles.rowBody}>
                <Text style={styles.headline} numberOfLines={2}>
                  {sessionHeadline(it)}
                </Text>
                {it.summaryPreview.trim() ? (
                  <Text style={styles.preview} numberOfLines={3}>
                    {it.summaryPreview}
                  </Text>
                ) : null}
                {it.focusAreasPreview?.trim() ? (
                  <Text style={styles.focusPreview} numberOfLines={2}>
                    Фокус: {it.focusAreasPreview}
                  </Text>
                ) : null}
                <Text style={styles.ctaHint}>{copy.publishedSessionReportsOpenHint}</Text>
              </View>
            </PressableFeedback>
          ))
        )}
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
    paddingVertical: 10,
    paddingHorizontal: 2,
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
  errBlock: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  retryBtn: {
    alignSelf: "flex-start",
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 22,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  rowPress: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.cardBorder,
  },
  accent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "rgba(74, 158, 255, 0.45)",
    marginRight: 12,
    alignSelf: "stretch",
    minHeight: 48,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6,
    letterSpacing: 0.15,
  },
  preview: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  focusPreview: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  ctaHint: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    letterSpacing: 0.2,
  },
});

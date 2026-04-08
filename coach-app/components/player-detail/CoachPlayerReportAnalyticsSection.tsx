import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type { CoachTrainingSessionReportAnalytics } from "@/services/coachPlayersService";
import { COACH_AUTH_REQUIRED_LINE, COACH_PLAYER_DETAIL_COPY } from "@/lib/coachPlayerDetailUi";

function reportsPrepositionalLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "отчёте";
  return "отчётах";
}

function reportsDativeLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "отчёту";
  return "отчётам";
}

type Props = {
  loading: boolean;
  analytics: CoachTrainingSessionReportAnalytics | null;
  loadError: string | null;
  onRetry: () => void;
};

function trendHeadline(kind: CoachTrainingSessionReportAnalytics["recentTrend"]["kind"]): string {
  const c = COACH_PLAYER_DETAIL_COPY;
  if (kind === "improving") return c.reportTrendImproving;
  if (kind === "stable") return c.reportTrendStable;
  return c.reportTrendMixed;
}

export function CoachPlayerReportAnalyticsSection({
  loading,
  analytics,
  loadError,
  onRetry,
}: Props) {
  const copy = COACH_PLAYER_DETAIL_COPY;

  return (
    <DashboardSection title={copy.reportAnalyticsTitle}>
      <Text style={styles.sectionSub}>{copy.reportAnalyticsSub}</Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>{copy.reportAnalyticsLoading}</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errBlock}>
            <Text style={styles.errorText}>{loadError}</Text>
            {loadError !== COACH_AUTH_REQUIRED_LINE ? (
              <Text style={styles.hint}>{copy.networkRetryHint}</Text>
            ) : null}
            <PrimaryButton title={copy.retryCta} variant="outline" onPress={onRetry} style={styles.retryBtn} />
          </View>
        ) : analytics ? (
          <View style={styles.blocks}>
            <View style={styles.block}>
              <Text style={styles.kicker}>{copy.reportAnalyticsThemesKicker}</Text>
              {analytics.recurringFocusThemes.length > 0 ? (
                analytics.recurringFocusThemes.map((t, i) => (
                  <View key={`${t.label}-${i}`} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <View style={styles.bulletBody}>
                      <Text style={styles.themeLabel} numberOfLines={4}>
                        {t.label}
                      </Text>
                      <Text style={styles.meta}>
                        замечено в {t.sessionsCount} {reportsPrepositionalLabel(t.sessionsCount)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyBlock}>{copy.reportAnalyticsThemesEmpty}</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.block}>
              <Text style={styles.kicker}>{copy.reportAnalyticsTrendKicker}</Text>
              <Text style={styles.trendChip}>{trendHeadline(analytics.recentTrend.kind)}</Text>
              <Text style={styles.trendBody}>{analytics.recentTrend.summaryLine}</Text>
              {analytics.recentTrend.basedOnSessions > 0 ? (
                <Text style={styles.meta}>
                  Оценка по последним {analytics.recentTrend.basedOnSessions}{" "}
                  {reportsDativeLabel(analytics.recentTrend.basedOnSessions)}
                </Text>
              ) : null}
            </View>

            <View style={styles.divider} />

            <View style={styles.block}>
              <Text style={styles.kicker}>{copy.reportAnalyticsAttentionKicker}</Text>
              {analytics.attentionSignals.length > 0 ? (
                analytics.attentionSignals.map((a, i) => (
                  <View key={`${a.label}-${i}`} style={styles.attRow}>
                    <Text style={styles.attLabel} numberOfLines={3}>
                      {a.label}
                    </Text>
                    <Text style={styles.meta}>
                      в {a.sessionsCount} {reportsPrepositionalLabel(a.sessionsCount)} · {a.hint}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyBlock}>{copy.reportAnalyticsAttentionEmpty}</Text>
              )}
            </View>

            {analytics.caveats.length > 0 ? (
              <>
                <View style={styles.divider} />
                <View style={styles.block}>
                  <Text style={styles.kicker}>{copy.reportAnalyticsCaveatsKicker}</Text>
                  {analytics.caveats.map((line, i) => (
                    <Text key={i} style={styles.caveatLine}>
                      · {line}
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
  blocks: {
    paddingHorizontal: theme.spacing.sm,
  },
  block: {
    paddingVertical: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  bullet: {
    color: theme.colors.primary,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 1,
  },
  bulletBody: {
    flex: 1,
    minWidth: 0,
  },
  themeLabel: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  meta: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyBlock: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: 14,
  },
  trendChip: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryMuted,
    overflow: "hidden",
  },
  trendBody: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  attRow: {
    marginBottom: 12,
  },
  attLabel: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    marginBottom: 4,
  },
  caveatLine: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
});

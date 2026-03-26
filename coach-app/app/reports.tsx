import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  CoachListHero,
  CoachListSkeletonCard,
  formatCoachListContextDate,
} from "@/components/lists/CoachListScreenPrimitives";
import {
  getWeeklyReadyReports,
  type WeeklyReportItem,
} from "@/lib/weeklyReportHelpers";
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from "@/lib/endpointAvailability";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";
import {
  COACH_REPORTS_SCREEN_COPY as COPY,
  COACH_AUTH_REQUIRED_LINE,
  reportsStatMidLabel,
} from "@/lib/coachReportsScreenUi";

const RECENT_DAYS = 7;

function pluralReport(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "отчёт";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "отчёта";
  return "отчётов";
}

function reportsCountRu(n: number): string {
  return `${n} ${pluralReport(n)}`;
}

function hasSummaryPreview(item: WeeklyReportItem): boolean {
  const s = item.summary?.trim();
  return Boolean(s && s !== "—");
}

function parseUpdatedMs(iso?: string): number | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function formatFreshness(iso?: string): string | null {
  const t = parseUpdatedMs(iso);
  if (t === null) return null;
  const diffMs = Date.now() - t;
  const d = Math.floor(diffMs / 86400000);
  if (d < 0) return "Недавно";
  if (d === 0) return "Сегодня";
  if (d === 1) return "Вчера";
  if (d < RECENT_DAYS) return `${d} дн. назад`;
  try {
    return new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

function isRecentUpdate(iso: string | undefined): boolean {
  const t = parseUpdatedMs(iso);
  if (t === null) return false;
  return Date.now() - t < RECENT_DAYS * 86400000;
}

function needsScoreAttention(avg?: number): boolean {
  return typeof avg === "number" && Number.isFinite(avg) && avg < 50;
}

type ReportListStats = {
  total: number;
  withPreview: number;
  hasAnyDates: boolean;
  recentCount: number;
  hasAnyScores: boolean;
  attentionScoreCount: number;
};

function computeReportStats(items: WeeklyReportItem[]): ReportListStats {
  const hasAnyDates = items.some((it) => parseUpdatedMs(it.updatedAt) !== null);
  const recentCount = items.filter((it) => isRecentUpdate(it.updatedAt)).length;
  const hasAnyScores = items.some((it) => typeof it.avgScore === "number");
  const attentionScoreCount = items.filter((it) => needsScoreAttention(it.avgScore)).length;
  return {
    total: items.length,
    withPreview: items.filter((it) => hasSummaryPreview(it)).length,
    hasAnyDates,
    recentCount,
    hasAnyScores,
    attentionScoreCount,
  };
}

function buildSummaryLines(stats: ReportListStats): { primary: string; secondary: string | null } {
  if (stats.total === 0) {
    return {
      primary:
        "Готовые отчёты по игрокам появляются после тренировочного контура и голосовых материалов — здесь архив для разбора и разговора с родителями.",
      secondary: null,
    };
  }

  const primary = `В списке ${reportsCountRu(stats.total)} — каждый ведёт в полный отчёт в карточке игрока.`;

  const parts: string[] = [];
  if (stats.withPreview < stats.total) {
    parts.push(`${stats.total - stats.withPreview} без краткого превью в списке — текст внутри отчёта.`);
  } else {
    parts.push("У всех позиций есть превью.");
  }
  if (!stats.hasAnyDates) {
    parts.push("Даты обновления в ответе списка нет — сортировка по свежести опирается на имя и сигналы «в фокусе».");
  }
  if (stats.hasAnyScores && stats.attentionScoreCount > 0) {
    parts.push(`${stats.attentionScoreCount} с средним баллом ниже 50 в данных списка — стоит открыть первым.`);
  }

  return { primary, secondary: parts.join(" ") };
}

function buildNextStepHint(stats: ReportListStats): string | null {
  if (stats.total === 0) return null;
  if (stats.attentionScoreCount > 0) return "Можно начать с карточек в фокусе по баллу — дальше обычный просмотр и шаринг.";
  if (stats.withPreview < stats.total) return "Строки без превью тоже полные после перехода.";
  return "Откройте игрока сверху или пройдите список по порядку.";
}

function sortReportsForCoach(items: WeeklyReportItem[]): WeeklyReportItem[] {
  return [...items].sort((a, b) => {
    const na = needsScoreAttention(a.avgScore);
    const nb = needsScoreAttention(b.avgScore);
    if (na !== nb) return na ? -1 : 1;
    const ta = parseUpdatedMs(a.updatedAt);
    const tb = parseUpdatedMs(b.updatedAt);
    if (ta !== null && tb !== null && ta !== tb) return tb - ta;
    if (ta !== null && tb === null) return -1;
    if (ta === null && tb !== null) return 1;
    return a.playerName.localeCompare(b.playerName, "ru");
  });
}

function partitionRecent(items: WeeklyReportItem[]): {
  recent: WeeklyReportItem[];
  rest: WeeklyReportItem[];
  showGroups: boolean;
} {
  const hasAnyDates = items.some((it) => parseUpdatedMs(it.updatedAt) !== null);
  if (!hasAnyDates) {
    return { recent: [], rest: items, showGroups: false };
  }
  const recent = items.filter((it) => isRecentUpdate(it.updatedAt));
  const rest = items.filter((it) => !isRecentUpdate(it.updatedAt));
  return {
    recent,
    rest,
    showGroups: recent.length > 0 && rest.length > 0,
  };
}

function ReportsErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isAuth = message === COACH_AUTH_REQUIRED_LINE;
  return (
    <SectionCard elevated style={styles.errorCard}>
      <Text style={styles.errorHeading}>{COPY.errorHeading}</Text>
      <Text style={styles.errorBody}>{COPY.errorBody}</Text>
      {message ? (
        <Text style={styles.errorDetail} numberOfLines={4}>
          {message}
        </Text>
      ) : null}
      {!isAuth ? <Text style={styles.errorHint}>{COPY.networkRetryHint}</Text> : null}
      <PrimaryButton
        animatedPress
        title={COPY.retryCta}
        variant="outline"
        onPress={onRetry}
        style={styles.errorRetry}
      />
    </SectionCard>
  );
}

function SummaryStatsStrip({ stats }: { stats: ReportListStats }) {
  const midLabel = reportsStatMidLabel(stats.hasAnyDates, RECENT_DAYS);
  const midValue = stats.hasAnyDates ? String(stats.recentCount) : "—";
  const rightLabel = stats.hasAnyScores ? COPY.statFocus : COPY.statScore;
  const rightValue = stats.hasAnyScores ? String(stats.attentionScoreCount) : "—";

  return (
    <View style={styles.statsStrip}>
      <View style={styles.statCell}>
        <Text style={styles.statValue} numberOfLines={1}>
          {stats.total}
        </Text>
        <Text style={styles.statLabel} numberOfLines={2}>
          {COPY.statTotal}
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCell}>
        <Text style={[styles.statValue, stats.hasAnyDates && stats.recentCount > 0 && styles.statValueAccent]} numberOfLines={1}>
          {midValue}
        </Text>
        <Text style={styles.statLabel} numberOfLines={2}>
          {midLabel}
        </Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCell}>
        <Text
          style={[styles.statValue, stats.hasAnyScores && stats.attentionScoreCount > 0 && styles.statValueWarn]}
          numberOfLines={1}
        >
          {rightValue}
        </Text>
        <Text style={styles.statLabel} numberOfLines={2}>
          {rightLabel}
        </Text>
      </View>
    </View>
  );
}

function ReportCard({ item, onOpen }: { item: WeeklyReportItem; onOpen: () => void }) {
  const preview = hasSummaryPreview(item);
  const freshness = formatFreshness(item.updatedAt);
  const attention = needsScoreAttention(item.avgScore);
  const secondaryParts: string[] = [];
  if (freshness) secondaryParts.push(`${COPY.labelUpdated}: ${freshness}`);
  if (typeof item.observationsCount === "number" && item.observationsCount > 0) {
    secondaryParts.push(`${COPY.labelObservations}: ${item.observationsCount}`);
  }
  if (typeof item.avgScore === "number") {
    secondaryParts.push(`${COPY.labelAvgScore}: ${Math.round(item.avgScore)}`);
  }
  const secondaryLine =
    secondaryParts.length > 0 ? secondaryParts.join(" · ") : COPY.reportSecondaryFallback;

  const summaryText =
    item.summary?.trim() && item.summary.trim() !== "—"
      ? item.summary.trim()
      : COPY.reportPreviewEmpty;

  return (
    <View style={styles.reportCardOuter}>
      <View style={[styles.reportAccent, !preview ? styles.reportAccentSoft : attention ? styles.reportAccentWarn : styles.reportAccentOk]} />
      <View style={styles.reportCardInner}>
        <PressableFeedback style={styles.reportPress} onPress={onOpen}>
          <View style={styles.reportPressRow}>
            <View style={styles.reportMain}>
              <View style={styles.reportTopRow}>
                <Text style={styles.reportKicker} numberOfLines={1}>
                  {COPY.reportKicker}
                </Text>
                <View style={styles.reportBadgeRow}>
                  {attention ? (
                    <View style={styles.badgeAttention}>
                      <Text style={styles.badgeAttentionText}>{COPY.badgeFocus}</Text>
                    </View>
                  ) : null}
                  <View style={styles.badgeReady}>
                    <Text style={styles.badgeReadyText}>{COPY.badgeReady}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.reportPlayerName} numberOfLines={2}>
                {item.playerName?.trim() || COPY.reportPlayerFallback}
              </Text>
              <Text style={styles.reportSecondary} numberOfLines={2}>
                {secondaryLine}
              </Text>
              <Text style={styles.reportSummary} numberOfLines={3}>
                {summaryText}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textMuted}
              style={styles.reportChevron}
            />
          </View>
        </PressableFeedback>
        <PrimaryButton
          animatedPress
          title={COPY.reportOpenCta}
          variant="outline"
          onPress={onOpen}
          style={styles.reportCta}
        />
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<WeeklyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback((opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    return getWeeklyReadyReports()
      .then((data) => {
        setReports(data);
        setError(null);
        setLoadedOnce(true);
      })
      .catch((err) => {
        setReports([]);
        setError(
          isAuthRequiredError(err)
            ? COACH_AUTH_REQUIRED_LINE
            : COPY.loadErrorGeneric
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchReports({ silent: loadedOnce });
    }, [fetchReports, loadedOnce])
  );

  const dateLabel = formatCoachListContextDate();

  const sortedReports = useMemo(() => sortReportsForCoach(reports), [reports]);

  const { recent: recentBlock, rest: restBlock, showGroups } = useMemo(
    () => partitionRecent(sortedReports),
    [sortedReports]
  );

  const listStats = useMemo(() => computeReportStats(reports), [reports]);
  const summaryLines = useMemo(() => buildSummaryLines(listStats), [listStats]);
  const nextStepHint = useMemo(() => buildNextStepHint(listStats), [listStats]);

  const countLabel =
    reports.length > 0 ? reportsCountRu(reports.length) : COPY.emptyArchiveLabel;

  if (loading && !loadedOnce) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachListHero
            eyebrow={COPY.heroEyebrow}
            title={COPY.heroTitle}
            dateLabel={dateLabel}
            countLabel={COPY.loadingCountLabel}
            subtitle={COPY.loadingSubtitle}
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={14}>
          <CoachListSkeletonCard />
        </StaggerFadeIn>
        <View style={styles.bottomSpacer} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.content}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachListHero
            eyebrow={COPY.heroEyebrow}
            title={COPY.heroTitle}
            dateLabel={dateLabel}
            countLabel={COPY.errorCountLabel}
            subtitle={COPY.heroSubtitleError}
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={16}>
          <ReportsErrorCard message={error} onRetry={() => void fetchReports()} />
        </StaggerFadeIn>
        <View style={styles.bottomSpacer} />
      </ScreenContainer>
    );
  }

  const openReport = (playerId: string) => router.push(`/player/${playerId}/report`);

  return (
    <ScreenContainer contentContainerStyle={styles.content}>
      <StaggerFadeIn preset="snappy" delay={0}>
        <CoachListHero
          eyebrow={COPY.heroEyebrow}
          title={COPY.heroTitle}
          dateLabel={dateLabel}
          countLabel={countLabel}
          subtitle={COPY.heroSubtitleLoaded}
        />
      </StaggerFadeIn>

      <StaggerFadeIn preset="snappy" delay={10}>
        <SectionCard elevated style={styles.summaryCard}>
          <Text style={styles.summaryKicker}>{COPY.summaryKicker}</Text>
          {reports.length > 0 ? <SummaryStatsStrip stats={listStats} /> : null}
          <Text style={[styles.summaryPrimary, reports.length > 0 && styles.summaryPrimaryAfterStats]}>
            {summaryLines.primary}
          </Text>
          {summaryLines.secondary ? (
            <Text style={styles.summarySecondary}>{summaryLines.secondary}</Text>
          ) : null}
          {reports.length > 0 && nextStepHint ? (
            <Text style={styles.summaryNextMuted}>{nextStepHint}</Text>
          ) : null}
        </SectionCard>
      </StaggerFadeIn>

      <StaggerFadeIn preset="snappy" delay={14}>
        <View style={styles.section}>
          {reports.length === 0 ? (
            <SectionCard elevated style={styles.emptyCard}>
              <View style={styles.emptyAccent} />
              <Text style={styles.emptyTitle}>
                {isEndpointUnavailable(COACH_ENDPOINTS.REPORTS_WEEKLY)
                  ? COPY.emptyTitleUnavailable
                  : COPY.emptyTitleNone}
              </Text>
              <Text style={styles.emptyText}>
                {isEndpointUnavailable(COACH_ENDPOINTS.REPORTS_WEEKLY)
                  ? COPY.emptyBodyUnavailable
                  : COPY.emptyBodyNone}
              </Text>
              <View style={styles.emptyActions}>
                {isEndpointUnavailable(COACH_ENDPOINTS.REPORTS_WEEKLY) ? (
                  <PrimaryButton
                    animatedPress
                    title={COPY.emptyRetryEndpoint}
                    variant="outline"
                    onPress={() => {
                      clearEndpointUnavailable(COACH_ENDPOINTS.REPORTS_WEEKLY);
                      void fetchReports();
                    }}
                  />
                ) : (
                  <>
                    <PrimaryButton
                      animatedPress
                      title={COPY.emptyCtaTraining}
                      onPress={() => router.push("/dev/coach-input")}
                    />
                    <PrimaryButton
                      animatedPress
                      title={COPY.emptyCtaVoice}
                      variant="outline"
                      onPress={() => router.push("/voice-note")}
                    />
                    <PrimaryButton
                      animatedPress
                      title={COPY.emptyCtaPlayers}
                      variant="outline"
                      onPress={() => router.push("/(tabs)/players" as Parameters<typeof router.push>[0])}
                    />
                  </>
                )}
              </View>
            </SectionCard>
          ) : (
            <>
              <SectionCard elevated style={styles.quickCard}>
                <Text style={styles.quickTitle}>{COPY.quickTitle}</Text>
                <Text style={styles.quickHint}>{COPY.quickHint}</Text>
                <View style={styles.quickRow}>
                  <PrimaryButton
                    animatedPress
                    title={COPY.quickPlayers}
                    variant="outline"
                    onPress={() => router.push("/(tabs)/players" as Parameters<typeof router.push>[0])}
                    style={styles.quickBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title={COPY.quickTraining}
                    variant="outline"
                    onPress={() => router.push("/dev/coach-input")}
                    style={styles.quickBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title={COPY.quickVoice}
                    variant="outline"
                    onPress={() => router.push("/voice-note")}
                    style={styles.quickBtn}
                  />
                  <PrimaryButton
                    animatedPress
                    title={COPY.quickMaterials}
                    variant="outline"
                    onPress={() => router.push("/created")}
                    style={styles.quickBtn}
                  />
                </View>
              </SectionCard>

              <Text style={styles.listSectionKicker}>{COPY.listSectionTitle}</Text>
              <Text style={styles.listSectionHint}>{COPY.listSectionHint}</Text>

              <View style={styles.listStack}>
                {showGroups ? (
                  <>
                    <Text style={styles.groupLabel}>{COPY.groupRecent}</Text>
                    {recentBlock.map((r) => (
                      <ReportCard key={r.playerId} item={r} onOpen={() => openReport(r.playerId)} />
                    ))}
                    <View style={styles.groupDivider} />
                    <Text style={styles.groupLabel}>{COPY.groupRest}</Text>
                    {restBlock.map((r) => (
                      <ReportCard key={r.playerId} item={r} onOpen={() => openReport(r.playerId)} />
                    ))}
                  </>
                ) : (
                  sortedReports.map((r) => (
                    <ReportCard key={r.playerId} item={r} onOpen={() => openReport(r.playerId)} />
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </StaggerFadeIn>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  statCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.cardBorder,
    opacity: 0.9,
    marginVertical: theme.spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 2,
  },
  statValueAccent: {
    color: theme.colors.primary,
  },
  statValueWarn: {
    color: theme.colors.warning,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.35,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 14,
  },
  summaryPrimary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },
  summaryPrimaryAfterStats: {
    marginTop: theme.spacing.xs,
  },
  summarySecondary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  summaryNextMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginTop: theme.spacing.md,
    fontStyle: "italic",
  },
  quickCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  quickHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  quickBtn: {
    flexGrow: 1,
    minWidth: 96,
  },
  listSectionKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  listSectionHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  listStack: {
    gap: 0,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  groupDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: theme.spacing.md,
    opacity: 0.95,
  },
  reportCardOuter: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: "hidden",
    ...theme.shadow.cardSubtle,
  },
  reportAccent: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: theme.colors.success,
    opacity: 0.75,
  },
  reportAccentOk: {
    backgroundColor: theme.colors.success,
    opacity: 0.7,
  },
  reportAccentSoft: {
    backgroundColor: theme.colors.accent,
    opacity: 0.55,
  },
  reportAccentWarn: {
    backgroundColor: theme.colors.warning,
    opacity: 0.85,
  },
  reportCardInner: {
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  reportPress: {
    marginBottom: theme.spacing.sm,
  },
  reportPressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  reportMain: {
    flex: 1,
    minWidth: 0,
  },
  reportChevron: {
    marginTop: theme.spacing.xs,
  },
  reportTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  reportKicker: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    flex: 1,
    minWidth: 0,
  },
  reportBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    justifyContent: "flex-end",
  },
  badgeAttention: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  badgeAttentionText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.warning,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  badgeReady: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  badgeReadyText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  reportPlayerName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    lineHeight: 24,
  },
  reportSecondary: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  reportSummary: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  reportCta: {
    alignSelf: "stretch",
  },
  emptyCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    position: "relative",
    overflow: "hidden",
  },
  emptyAccent: {
    position: "absolute",
    top: -18,
    right: -18,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primaryMuted,
    opacity: 0.35,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  emptyActions: {
    gap: theme.spacing.sm,
    alignSelf: "stretch",
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
  },
  errorHeading: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  errorBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  errorDetail: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  errorHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  errorRetry: {
    alignSelf: "flex-start",
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});

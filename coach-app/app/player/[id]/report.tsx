import React, { useState, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, type ViewStyle } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getParamId } from "@/lib/params";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PressableFeedback } from "@/components/ui/PressableFeedback";
import { SectionCard } from "@/components/ui/SectionCard";
import { StaggerFadeIn } from "@/components/dashboard/StaggerFadeIn";
import {
  CoachDetailEmptyState,
  CoachDetailErrorState,
  CoachDetailHero,
  CoachDetailLoadingBody,
} from "@/components/details/CoachDetailScreenPrimitives";
import {
  getCoachPlayerReport,
  type PlayerReportObservationNote,
  type PlayerReportResult,
} from "@/services/coachReportsService";
import type { OverallAssessment } from "@/lib/playerReportHelpers";
import { isAuthRequiredError } from "@/lib/coachAuth";
import { theme } from "@/constants/theme";
import {
  COACH_PLAYER_REPORT_SCREEN_COPY as COPY,
  COACH_AUTH_REQUIRED_LINE,
  coachPlayerReportObsMoreLine,
  coachPlayerReportObservationCountLabel,
} from "@/lib/coachPlayerReportScreenUi";

function isPlaceholderLine(s: string): boolean {
  const t = s.trim();
  return !t || t === "—" || t === "-";
}

function formatReportContextDate(iso?: string): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatObservationWhen(iso?: string): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryMetricChip({ label }: { label: string }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipText} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function SectionKicker({ children }: { children: string }) {
  return (
    <Text style={styles.sectionKicker} numberOfLines={1}>
      {children}
    </Text>
  );
}

function AssessmentCard({
  label,
  assessment,
  score,
}: {
  label: string;
  assessment: OverallAssessment;
  score: number | null;
}) {
  const config = {
    good: { tone: COPY.assessmentToneGood, color: theme.colors.success },
    stable: { tone: COPY.assessmentToneStable, color: theme.colors.accent },
    "needs-attention": { tone: COPY.assessmentToneAttention, color: theme.colors.warning },
  };
  const { tone, color } = config[assessment];
  return (
    <SectionCard
      elevated
      style={StyleSheet.flatten([styles.assessmentCard, { borderLeftColor: color }]) as ViewStyle}
    >
      <SectionKicker>{COPY.assessmentKicker}</SectionKicker>
      <View style={styles.assessmentRow}>
        <View style={styles.assessmentContent}>
          <Text style={[styles.assessmentTone, { color }]}>{tone}</Text>
          <Text style={[styles.assessmentLabel, { color }]} numberOfLines={3}>
            {label}
          </Text>
          {score !== null ? (
            <Text style={styles.assessmentScore}>
              {COPY.assessmentScorePrefix} {score}
            </Text>
          ) : null}
        </View>
      </View>
    </SectionCard>
  );
}

function BulletListSection({
  title,
  kicker,
  items,
  bulletColor,
  cardStyle,
}: {
  title: string;
  kicker: string;
  items: string[];
  bulletColor: string;
  cardStyle?: ViewStyle;
}) {
  const clean = items.filter((x) => !isPlaceholderLine(x));
  if (clean.length === 0) return null;
  return (
    <View style={styles.sectionBlock}>
      <SectionKicker>{kicker}</SectionKicker>
      <Text style={styles.sectionTitle} numberOfLines={2}>
        {title}
      </Text>
      <SectionCard
        elevated
        style={StyleSheet.flatten([styles.sectionCard, cardStyle]) as ViewStyle}
      >
        {clean.map((item, i) => (
          <View key={i} style={[styles.bulletRow, i > 0 && styles.bulletRowSpaced]}>
            <Text style={[styles.bullet, { color: bulletColor }]}>•</Text>
            <Text style={styles.bulletText} selectable>
              {item}
            </Text>
          </View>
        ))}
      </SectionCard>
    </View>
  );
}

function RecommendationBlock({ text }: { text: string }) {
  const t = text.trim();
  if (!t || isPlaceholderLine(t)) return null;
  return (
    <View style={styles.sectionBlock}>
      <SectionKicker>{COPY.recKicker}</SectionKicker>
      <Text style={styles.sectionTitle} numberOfLines={2}>
        {COPY.recTitle}
      </Text>
      <SectionCard
        elevated
        style={StyleSheet.flatten([styles.sectionCard, styles.recommendationCard]) as ViewStyle}
      >
        <Text style={styles.recommendationText} selectable>
          {t}
        </Text>
      </SectionCard>
    </View>
  );
}

function ObservationsDetailSection({ notes }: { notes: PlayerReportObservationNote[] }) {
  if (notes.length === 0) return null;
  const maxShow = 14;
  const shown = notes.slice(0, maxShow);
  const rest = notes.length - shown.length;
  return (
    <View style={styles.sectionBlock}>
      <SectionKicker>{COPY.obsKicker}</SectionKicker>
      <Text style={styles.sectionTitle} numberOfLines={2}>
        {COPY.obsTitle}
      </Text>
      <SectionCard
        elevated
        style={StyleSheet.flatten([styles.sectionCard, styles.obsCard]) as ViewStyle}
      >
        {shown.map((n, i) => {
          const when = formatObservationWhen(n.createdAt);
          const metaBits: string[] = [];
          if (n.skillKey?.trim()) metaBits.push(n.skillKey.trim());
          if (typeof n.score === "number")
            metaBits.push(`${COPY.obsScorePrefix} ${n.score}`);
          if (when) metaBits.push(when);
          const body = n.noteText?.trim();
          return (
            <View key={n.id} style={[styles.obsRow, i > 0 && styles.obsRowBorder]}>
              {metaBits.length > 0 ? (
                <Text style={styles.obsMeta} numberOfLines={2}>
                  {metaBits.join(" · ")}
                </Text>
              ) : null}
              {body ? (
                <Text style={styles.obsBody} selectable numberOfLines={8}>
                  {body}
                </Text>
              ) : (
                <Text style={styles.obsBodyMuted} numberOfLines={2}>
                  {COPY.obsNoBody}
                </Text>
              )}
            </View>
          );
        })}
        {rest > 0 ? (
          <Text style={styles.obsMore} numberOfLines={2}>
            {coachPlayerReportObsMoreLine(rest)}
          </Text>
        ) : null}
      </SectionCard>
    </View>
  );
}

function QuickNavCard({
  onPlayer,
  onShare,
  onMessages,
}: {
  onPlayer: () => void;
  onShare: () => void;
  onMessages: () => void;
}) {
  return (
    <SectionCard elevated style={styles.quickNavCard}>
      <Text style={styles.quickNavTitle}>{COPY.quickNavTitle}</Text>
      <Text style={styles.quickNavHint}>{COPY.quickNavHint}</Text>
      <View style={styles.quickLinksRow}>
        <PressableFeedback onPress={onPlayer} style={styles.quickLinkHit}>
          <View style={styles.quickLinkInner}>
            <Text style={styles.quickLinkText} numberOfLines={1}>
              {COPY.quickToPlayer}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
        </PressableFeedback>
        <Text style={styles.quickLinkSep}>·</Text>
        <PressableFeedback onPress={onShare} style={styles.quickLinkHit}>
          <View style={styles.quickLinkInner}>
            <Text style={styles.quickLinkText} numberOfLines={1}>
              {COPY.quickShare}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
        </PressableFeedback>
        <Text style={styles.quickLinkSep}>·</Text>
        <PressableFeedback onPress={onMessages} style={styles.quickLinkHit}>
          <View style={styles.quickLinkInner}>
            <Text style={styles.quickLinkText} numberOfLines={1}>
              {COPY.quickMessages}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </View>
        </PressableFeedback>
      </View>
    </SectionCard>
  );
}

export default function PlayerReportScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const [payload, setPayload] = useState<PlayerReportResult | null | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(() => {
    if (!id) return;
    setPayload("loading");
    setError(null);
    getCoachPlayerReport(id)
      .then((data) => {
        setPayload(data ?? null);
      })
      .catch((err) => {
        setPayload(null);
        setError(
          isAuthRequiredError(err) ? COACH_AUTH_REQUIRED_LINE : COPY.loadErrorGeneric
        );
      });
  }, [id]);

  useFocusEffect(useCallback(() => fetchReport(), [fetchReport]));

  if (!id) {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <CoachDetailErrorState
          title={COPY.noIdTitle}
          description={COPY.noIdDescription}
          retryTitle={COPY.backCta}
          onRetry={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (payload === "loading") {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <CoachDetailLoadingBody
          eyebrow={COPY.loadingEyebrow}
          title={COPY.loadingTitle}
          subtitle={COPY.loadingSubtitle}
        />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <CoachDetailErrorState
          title={COPY.errorTitle}
          description={error}
          hint={
            error !== COACH_AUTH_REQUIRED_LINE ? COPY.networkRetryHint : undefined
          }
          retryTitle={COPY.retryCta}
          onRetry={fetchReport}
          backTitle={COPY.backCta}
          onBack={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  if (!payload) {
    return (
      <ScreenContainer contentContainerStyle={styles.screenPad}>
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachDetailHero
            eyebrow={COPY.emptyHeroEyebrow}
            title={COPY.emptyHeroTitle}
            subtitle={COPY.emptyHeroSubtitle}
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={14}>
          <CoachDetailEmptyState
            title={COPY.emptyTitle}
            description={COPY.emptyDescription}
            primaryTitle={COPY.emptyRefreshCta}
            onPrimary={fetchReport}
            secondaryTitle={COPY.emptyToPlayerCta}
            onSecondary={() => router.push(`/player/${id}`)}
          />
        </StaggerFadeIn>
        <StaggerFadeIn preset="snappy" delay={24}>
          <View style={styles.emptyExtra}>
            <PrimaryButton
              title={COPY.emptyMessagesCta}
              variant="outline"
              onPress={() => router.push("/(tabs)/messages" as Parameters<typeof router.push>[0])}
            />
          </View>
        </StaggerFadeIn>
      </ScreenContainer>
    );
  }

  const { report, playerName, reportUpdatedAt, executiveSummary, topSkillKeys, observationNotes } = payload;
  const dateLine = formatReportContextDate(reportUpdatedAt);
  const periodMeta =
    dateLine ??
    (report.period && report.period !== "последние тренировки" ? report.period : null);

  const metricChips: string[] = [];
  if (report.observationCount > 0) {
    metricChips.push(coachPlayerReportObservationCountLabel(report.observationCount));
  }
  if (report.overallScore !== null) {
    metricChips.push(`${COPY.metricScorePrefix} ${report.overallScore}`);
  }
  if (topSkillKeys && topSkillKeys.length > 0) {
    metricChips.push(`${COPY.metricSkillsFocus} ${topSkillKeys.length}`);
  }
  if (observationNotes && observationNotes.length > 0) {
    metricChips.push(`${observationNotes.length} записей`);
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StaggerFadeIn preset="snappy" delay={0}>
          <CoachDetailHero
            eyebrow={COPY.heroEyebrow}
            title={playerName.trim() || COPY.playerFallback}
            subtitle={COPY.heroSubtitle}
            metaLeft={periodMeta ?? undefined}
            metaRight={
              report.observationCount > 0
                ? coachPlayerReportObservationCountLabel(report.observationCount)
                : COPY.metaNoObservations
            }
          />
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={8}>
          <QuickNavCard
            onPlayer={() => router.push(`/player/${id}`)}
            onShare={() => router.push(`/player/${id}/share-report`)}
            onMessages={() => router.push("/(tabs)/messages" as Parameters<typeof router.push>[0])}
          />
        </StaggerFadeIn>

        {metricChips.length > 0 ? (
          <StaggerFadeIn preset="snappy" delay={14}>
            <SectionCard elevated style={styles.summaryCard}>
              <Text style={styles.summaryKicker}>{COPY.summaryKicker}</Text>
              <View style={styles.metricRow}>
                {metricChips.map((c) => (
                  <SummaryMetricChip key={c} label={c} />
                ))}
              </View>
              {!dateLine && report.period === "последние тренировки" ? (
                <Text style={styles.summaryFootnote} numberOfLines={2}>
                  {COPY.summaryDateFallbackNote}
                </Text>
              ) : null}
            </SectionCard>
          </StaggerFadeIn>
        ) : null}

        {executiveSummary ? (
          <StaggerFadeIn preset="snappy" delay={18}>
            <View style={styles.sectionBlock}>
              <SectionKicker>{COPY.execKicker}</SectionKicker>
              <Text style={styles.sectionTitle} numberOfLines={2}>
                {COPY.execTitle}
              </Text>
              <SectionCard
                elevated
                style={StyleSheet.flatten([styles.sectionCard, styles.execCard]) as ViewStyle}
              >
                <Text style={styles.execText} selectable>
                  {executiveSummary}
                </Text>
              </SectionCard>
            </View>
          </StaggerFadeIn>
        ) : null}

        <StaggerFadeIn preset="snappy" delay={22}>
          <AssessmentCard
            label={report.overallLabel}
            assessment={report.overallAssessment}
            score={report.overallScore}
          />
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={28}>
          <BulletListSection
            kicker={COPY.strengthsKicker}
            title={COPY.strengthsTitle}
            items={report.strengths}
            bulletColor={theme.colors.primary}
            cardStyle={styles.strengthsCard}
          />
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={34}>
          <BulletListSection
            kicker={COPY.growthKicker}
            title={COPY.growthTitle}
            items={report.growthAreas}
            bulletColor={theme.colors.warning}
            cardStyle={styles.growthCard}
          />
        </StaggerFadeIn>

        <StaggerFadeIn preset="snappy" delay={40}>
          <RecommendationBlock text={report.recommendation} />
        </StaggerFadeIn>

        {observationNotes && observationNotes.length > 0 ? (
          <StaggerFadeIn preset="snappy" delay={46}>
            <ObservationsDetailSection notes={observationNotes} />
          </StaggerFadeIn>
        ) : null}

        <StaggerFadeIn preset="snappy" delay={52}>
          <View style={styles.ctaBlock}>
            <PrimaryButton
              animatedPress
              title={COPY.shareCta}
              variant="primary"
              onPress={() => router.push(`/player/${id}/share-report`)}
              style={styles.shareBtn}
            />
            <Text style={styles.ctaHint} numberOfLines={3}>
              {COPY.shareHint}
            </Text>
          </View>
        </StaggerFadeIn>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenPad: {
    paddingBottom: theme.spacing.xxl,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  quickNavCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  quickNavTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  quickNavHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  quickLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  quickLinkHit: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    maxWidth: "100%",
  },
  quickLinkInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    maxWidth: "100%",
  },
  quickLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    flexShrink: 1,
  },
  quickLinkSep: {
    fontSize: 14,
    color: theme.colors.textMuted,
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
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  metricChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxWidth: "100%",
  },
  metricChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  summaryFootnote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
  sectionBlock: {
    marginBottom: theme.spacing.lg,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.45,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sectionCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.cardBorder,
  },
  strengthsCard: {
    borderLeftColor: theme.colors.primary,
  },
  growthCard: {
    borderLeftColor: theme.colors.warning,
  },
  recommendationCard: {
    borderLeftColor: theme.colors.primary,
  },
  execCard: {
    borderLeftColor: theme.colors.accent,
  },
  obsCard: {
    borderLeftColor: theme.colors.accent,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletRowSpaced: {
    marginTop: theme.spacing.sm,
  },
  bullet: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
    lineHeight: 22,
  },
  bulletText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
    minWidth: 0,
    lineHeight: 22,
  },
  recommendationText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
  assessmentCard: {
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
  },
  assessmentRow: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  assessmentContent: { flex: 1, minWidth: 0 },
  assessmentTone: {
    ...theme.typography.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: theme.spacing.xs,
  },
  assessmentLabel: {
    ...theme.typography.title,
    fontSize: 18,
  },
  assessmentScore: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  obsRow: {
    paddingVertical: theme.spacing.sm,
  },
  obsRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  obsMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 4,
    lineHeight: 18,
  },
  obsBody: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  obsBodyMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },
  obsMore: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  ctaBlock: {
    marginTop: theme.spacing.md,
  },
  shareBtn: {
    width: "100%",
  },
  ctaHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 19,
    marginTop: theme.spacing.sm,
  },
  emptyExtra: {
    marginTop: theme.spacing.sm,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  execText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
});

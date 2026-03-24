import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { getParamId } from "@/lib/params";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { getCoachPlayerReport } from "@/services/coachReportsService";
import type { PlayerReport, OverallAssessment } from "@/lib/playerReportHelpers";
import { theme } from "@/constants/theme";

function ReportHeader({ playerName, period }: { playerName: string; period: string }) {
  return (
    <View style={reportStyles.header}>
      <Text style={reportStyles.headerEyebrow}>Отчёт по игроку</Text>
      <Text style={reportStyles.headerName}>{playerName}</Text>
      <Text style={reportStyles.headerPeriod}>{period}</Text>
    </View>
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
    good: { emoji: "🌟", color: theme.colors.success, bg: theme.colors.primaryMuted },
    stable: { emoji: "📊", color: theme.colors.accent, bg: theme.colors.accentMuted },
    "needs-attention": { emoji: "💪", color: theme.colors.warning, bg: "rgba(245,166,35,0.15)" },
  };
  const { emoji, color } = config[assessment];
  return (
    <SectionCard
      elevated
      style={{ ...reportStyles.assessmentCard, borderLeftColor: color }}
    >
      <View style={reportStyles.assessmentRow}>
        <Text style={reportStyles.assessmentEmoji}>{emoji}</Text>
        <View style={reportStyles.assessmentContent}>
          <Text style={[reportStyles.assessmentLabel, { color }]}>{label}</Text>
          {score !== null ? (
            <Text style={reportStyles.assessmentScore}>Средний балл: {score}</Text>
          ) : null}
        </View>
      </View>
    </SectionCard>
  );
}

function StrengthsSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={reportStyles.section}>
      <Text style={reportStyles.sectionTitle}>✨ Ключевые сильные стороны</Text>
      <SectionCard elevated>
        {items.map((item, i) => (
          <View key={i} style={reportStyles.bulletRow}>
            <Text style={reportStyles.bullet}>•</Text>
            <Text style={reportStyles.bulletText}>{item}</Text>
          </View>
        ))}
      </SectionCard>
    </View>
  );
}

function GrowthSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={reportStyles.section}>
      <Text style={reportStyles.sectionTitle}>🎯 Зоны роста</Text>
      <SectionCard elevated style={reportStyles.growthCard}>
        {items.map((item, i) => (
          <View key={i} style={reportStyles.bulletRow}>
            <Text style={[reportStyles.bullet, { color: theme.colors.warning }]}>•</Text>
            <Text style={reportStyles.bulletText}>{item}</Text>
          </View>
        ))}
      </SectionCard>
    </View>
  );
}

function RecommendationSection({ text }: { text: string }) {
  return (
    <View style={reportStyles.section}>
      <Text style={reportStyles.sectionTitle}>📝 Рекомендации тренера</Text>
      <SectionCard elevated style={reportStyles.recommendationCard}>
        <Text style={reportStyles.recommendationText}>{text}</Text>
      </SectionCard>
    </View>
  );
}

export default function PlayerReportScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = getParamId(params.id);
  const router = useRouter();
  const [reportData, setReportData] = useState<{
    report: PlayerReport;
    playerName: string;
  } | null | "loading">("loading");

  const fetchReport = useCallback(() => {
    if (!id) return;
    setReportData("loading");
    getCoachPlayerReport(id).then((data) => {
      setReportData(data ?? null);
    });
  }, [id]);

  useFocusEffect(useCallback(() => fetchReport(), [fetchReport]));

  if (!id) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Игрок не найден</Text>
          <PrimaryButton title="Назад" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  if (reportData === "loading") {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Формируем отчёт…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!reportData) {
    return (
      <ScreenContainer>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Пока нет отчёта</Text>
          <Text style={styles.emptyText}>
            Нужно минимум 3 наблюдения. Запишите тренировку
          </Text>
          <PrimaryButton title="Повторить" variant="outline" onPress={fetchReport} style={styles.retryBtn} />
          <PrimaryButton title="Назад" variant="ghost" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const { report, playerName } = reportData;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ReportHeader playerName={playerName} period={report.period} />
        <AssessmentCard
          label={report.overallLabel}
          assessment={report.overallAssessment}
          score={report.overallScore}
        />
        <StrengthsSection items={report.strengths} />
        <GrowthSection items={report.growthAreas} />
        <RecommendationSection text={report.recommendation} />
        <View style={styles.footer}>
          <Text style={styles.footerBadge}>на основе {report.observationCount} наблюдений</Text>
        </View>
        <View style={styles.shareCta}>
          <PrimaryButton
            title="Поделиться с родителем"
            variant="primary"
            onPress={() => router.push(`/player/${id}/share-report`)}
            style={styles.shareBtn}
          />
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: theme.spacing.xxl },
  notFound: {
    flex: 1,
    paddingVertical: theme.spacing.xxl,
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  notFoundText: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  empty: {
    flex: 1,
    paddingVertical: theme.spacing.xxl,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  retryBtn: { marginBottom: theme.spacing.sm },
  footer: {
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  shareCta: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  shareBtn: {
    width: "100%",
  },
  footerBadge: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  bottomSpacer: { height: theme.spacing.xl },
});

const reportStyles = StyleSheet.create({
  header: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: theme.colors.primary,
    textTransform: "uppercase",
    marginBottom: theme.spacing.xs,
  },
  headerName: {
    ...theme.typography.hero,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerPeriod: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  assessmentCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
  },
  assessmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  assessmentEmoji: { fontSize: 28 },
  assessmentContent: { flex: 1 },
  assessmentLabel: {
    ...theme.typography.title,
    fontSize: 18,
  },
  assessmentScore: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  bullet: {
    fontSize: 16,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  bulletText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  growthCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  recommendationCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  recommendationText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 24,
  },
});

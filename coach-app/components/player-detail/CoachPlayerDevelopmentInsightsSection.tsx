import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SectionCard } from "@/components/ui/SectionCard";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { theme } from "@/constants/theme";
import type { PlayerDevelopmentInsightDto } from "@/services/coachPlayersService";
import { COACH_AUTH_REQUIRED_LINE } from "@/lib/coachPlayerDetailUi";

type Props = {
  loading: boolean;
  insights: PlayerDevelopmentInsightDto | null;
  loadError: string | null;
  onRetry: () => void;
};

function momentumLabelRu(m: PlayerDevelopmentInsightDto["momentum"]): string {
  if (m === "up") return "К плюсу (по эвристике отчётов/сигналов)";
  if (m === "mixed") return "Смешанная картина";
  return "Без выраженного сдвига";
}

function confidenceLabelRu(c: PlayerDevelopmentInsightDto["confidence"]): string {
  if (c === "high") return "Полнота данных — выше средней";
  if (c === "moderate") return "Полнота данных — умеренная";
  return "Полнота данных — низкая";
}

function hasAnyBody(i: PlayerDevelopmentInsightDto): boolean {
  return (
    i.recurringThemes.length > 0 ||
    i.recentFocus.length > 0 ||
    i.attentionSignals.length > 0 ||
    Boolean(i.summaryLine?.trim())
  );
}

export function CoachPlayerDevelopmentInsightsSection({
  loading,
  insights,
  loadError,
  onRetry,
}: Props) {
  return (
    <DashboardSection title="Развитие игрока">
      <Text style={styles.sectionSub}>
        Сводка по опубликованным отчётам и подтверждённым live-сигналам — без оценки «правильно/неправильно».
      </Text>
      <SectionCard elevated style={styles.card}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.muted}>Собираем сводку…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errBlock}>
            <Text style={styles.errorText}>{loadError}</Text>
            {loadError !== COACH_AUTH_REQUIRED_LINE ? (
              <Text style={styles.hint}>Проверьте сеть и попробуйте снова.</Text>
            ) : null}
            <PrimaryButton title="Повторить" variant="outline" onPress={onRetry} style={styles.retryBtn} />
          </View>
        ) : insights ? (
          <View style={styles.body}>
            <View style={styles.metaRow}>
              <Text style={styles.metaChip}>{momentumLabelRu(insights.momentum)}</Text>
              <Text style={styles.metaChipMuted}>{confidenceLabelRu(insights.confidence)}</Text>
            </View>
            {insights.summaryLine ? (
              <Text style={styles.summary}>{insights.summaryLine}</Text>
            ) : null}

            <Text style={styles.kicker}>Повторяющиеся темы</Text>
            {insights.recurringThemes.length > 0 ? (
              insights.recurringThemes.map((line, i) => (
                <Text key={`rt-${i}`} style={styles.bulletLine}>
                  · {line}
                </Text>
              ))
            ) : (
              <Text style={styles.empty}>Пока нет устойчивых тем в данных — это нормально при малой истории.</Text>
            )}

            <Text style={styles.kickerSpaced}>Недавний фокус (live)</Text>
            {insights.recentFocus.length > 0 ? (
              insights.recentFocus.map((line, i) => (
                <Text key={`rf-${i}`} style={styles.bulletLine}>
                  · {line}
                </Text>
              ))
            ) : (
              <Text style={styles.empty}>Нет выделенного фокуса по недавним сигналам.</Text>
            )}

            <Text style={styles.kickerSpaced}>Сигналы внимания</Text>
            {insights.attentionSignals.length > 0 ? (
              insights.attentionSignals.map((line, i) => (
                <Text key={`at-${i}`} style={styles.bulletLineMuted}>
                  · {line}
                </Text>
              ))
            ) : (
              <Text style={styles.empty}>Явных акцентов «внимание» в сводке нет — при необходимости см. детальные блоки ниже.</Text>
            )}

            {!hasAnyBody(insights) ? (
              <Text style={styles.emptySoft}>
                Данных пока мало для содержательной сводки — загляните сюда после нескольких тренировок с отчётами и
                сигналами.
              </Text>
            ) : null}
          </View>
        ) : null}
      </SectionCard>
    </DashboardSection>
  );
}

const styles = StyleSheet.create({
  sectionSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    lineHeight: 18,
  },
  card: {
    marginTop: theme.spacing.xs,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  muted: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  errBlock: {
    paddingVertical: theme.spacing.sm,
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
  body: {
    gap: 0,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  metaChip: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaChipMuted: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summary: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  kicker: {
    ...theme.typography.caption,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  kickerSpaced: {
    ...theme.typography.caption,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    marginBottom: 6,
  },
  bulletLine: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    marginBottom: 4,
  },
  bulletLineMuted: {
    ...theme.typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  empty: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    lineHeight: 18,
  },
  emptySoft: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
});

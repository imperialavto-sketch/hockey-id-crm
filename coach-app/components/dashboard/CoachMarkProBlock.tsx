import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SectionCard } from "@/components/ui/SectionCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  getCoachMarkSummaries,
  type CoachMarkSummary,
} from "@/lib/coachMarkSummaryHelpers";
import { theme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";

function statusColor(status: string): string {
  if (status.includes("Хороший")) return theme.colors.success;
  if (status.includes("Требует")) return theme.colors.warning;
  return theme.colors.accent;
}

function CoachMarkBlockContent({
  summaries,
  loading,
  onOpenReport,
}: {
  summaries: CoachMarkSummary[];
  loading: boolean;
  onOpenReport: (playerId: string) => void;
}) {
  if (loading) {
    return (
      <SectionCard elevated style={cardStyles.active}>
        <View style={cardStyles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={cardStyles.loadingText}>Загрузка…</Text>
        </View>
      </SectionCard>
    );
  }

  if (summaries.length === 0) {
    return (
      <SectionCard elevated style={cardStyles.active}>
        <Text style={cardStyles.emptyTitle}>
          Пока нет сигналов
        </Text>
        <Text style={cardStyles.emptyText}>
          Запишите тренировку — Coach Mark соберёт данные
        </Text>
      </SectionCard>
    );
  }

  return (
    <SectionCard elevated style={cardStyles.active}>
      {summaries.map((s, i) => (
        <Pressable
          key={s.playerId}
          style={({ pressed }) => [
            cardStyles.summaryRow,
            i > 0 && cardStyles.summaryRowBorder,
            pressed && cardStyles.pressed,
          ]}
          onPress={() => onOpenReport(s.playerId)}
        >
          <View style={cardStyles.summaryContent}>
            <Text style={cardStyles.summaryName}>{s.playerName}</Text>
            <Text style={[cardStyles.summaryStatus, { color: statusColor(s.status) }]}>
              {s.status}
            </Text>
            <Text style={cardStyles.summaryInsight} numberOfLines={2}>
              {s.insightLine}
            </Text>
          </View>
          <PrimaryButton
            title="Открыть"
            variant="ghost"
            onPress={() => onOpenReport(s.playerId)}
            style={cardStyles.reportBtn}
            textStyle={cardStyles.reportBtnText}
          />
        </Pressable>
      ))}
    </SectionCard>
  );
}

export function CoachMarkProBlock() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<CoachMarkSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getCoachMarkSummaries().then((data) => {
        setSummaries(data);
        setLoading(false);
      });
    }, [])
  );

  return (
    <CoachMarkBlockContent
      summaries={summaries}
      loading={loading}
      onOpenReport={(id) => router.push(`/player/${id}/report`)}
    />
  );
}

const cardStyles = StyleSheet.create({
  active: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  emptyTitle: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  summaryRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  summaryName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 2,
  },
  summaryStatus: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  summaryInsight: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  reportBtn: {
    alignSelf: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  reportBtnText: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.8,
  },
});

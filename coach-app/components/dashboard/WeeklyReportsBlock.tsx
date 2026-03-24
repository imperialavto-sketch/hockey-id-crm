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
  getWeeklyReadyReports,
  type WeeklyReportItem,
} from "@/lib/weeklyReportHelpers";
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from "@/lib/endpointAvailability";
import { theme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";

function WeeklyReportsContent({
  reports,
  loading,
  onOpenReport,
  onAllReports,
  onRetry,
}: {
  reports: WeeklyReportItem[];
  loading: boolean;
  onOpenReport: (playerId: string) => void;
  onAllReports: () => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <SectionCard elevated style={blockStyles.active}>
        <View style={blockStyles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={blockStyles.loadingText}>Загрузка…</Text>
        </View>
      </SectionCard>
    );
  }

  if (reports.length === 0) {
    const unavailable = isEndpointUnavailable(COACH_ENDPOINTS.REPORTS_WEEKLY);
    return (
      <SectionCard elevated style={blockStyles.active}>
        <Text style={blockStyles.emptyTitle}>
          {unavailable ? 'Модуль отчётов пока не подключён' : 'Пока нет готовых отчётов'}
        </Text>
        <Text style={blockStyles.emptyText}>
          {unavailable ? 'Когда сервер будет готов, здесь появятся отчёты' : 'Запишите тренировку'}
        </Text>
        {unavailable ? (
          <PrimaryButton
            title="Проверить снова"
            variant="outline"
            onPress={onRetry}
            style={blockStyles.allBtn}
          />
        ) : (
          <PrimaryButton
            title="Все"
            variant="outline"
            onPress={onAllReports}
            style={blockStyles.allBtn}
          />
        )}
      </SectionCard>
    );
  }

  const displayList = reports.slice(0, 3);

  return (
    <SectionCard elevated style={blockStyles.active}>
      <View style={blockStyles.countRow}>
        <Text style={blockStyles.countText}>
          {reports.length} {reports.length === 1 ? "готовый отчёт" : reports.length < 5 ? "готовых отчёта" : "готовых отчётов"}
        </Text>
      </View>
      {displayList.map((r, i) => (
        <Pressable
          key={r.playerId}
          style={({ pressed }) => [
            blockStyles.reportRow,
            i > 0 && blockStyles.reportRowBorder,
            pressed && blockStyles.pressed,
          ]}
          onPress={() => onOpenReport(r.playerId)}
        >
          <View style={blockStyles.reportContent}>
            <Text style={blockStyles.reportName}>{r.playerName}</Text>
            <View style={blockStyles.statusBadge}>
              <Text style={blockStyles.statusText}>Готов</Text>
            </View>
            <Text style={blockStyles.reportSummary} numberOfLines={2}>
              {r.summary}
            </Text>
          </View>
          <PrimaryButton
            title="Открыть"
            variant="ghost"
            onPress={() => onOpenReport(r.playerId)}
            style={blockStyles.openBtn}
            textStyle={blockStyles.openBtnText}
          />
        </Pressable>
      ))}
      {reports.length > 0 && (
        <PrimaryButton
          title="Все"
          variant="outline"
          onPress={onAllReports}
          style={blockStyles.allBtn}
        />
      )}
    </SectionCard>
  );
}

export function WeeklyReportsBlock() {
  const router = useRouter();
  const [reports, setReports] = useState<WeeklyReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(() => {
    setLoading(true);
    getWeeklyReadyReports()
      .then((data) => setReports(data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => fetchReports(), [fetchReports]));

  const handleRetry = useCallback(() => {
    clearEndpointUnavailable(COACH_ENDPOINTS.REPORTS_WEEKLY);
    fetchReports();
  }, [fetchReports]);

  return (
    <WeeklyReportsContent
      reports={reports}
      loading={loading}
      onOpenReport={(id) => router.push(`/player/${id}/report`)}
      onAllReports={() => router.push("/reports")}
      onRetry={handleRetry}
    />
  );
}

const blockStyles = StyleSheet.create({
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
  countRow: {
    marginBottom: theme.spacing.md,
  },
  countText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  reportRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  reportContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  reportName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 2,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  reportSummary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  openBtn: {
    alignSelf: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  openBtnText: {
    fontSize: 13,
  },
  allBtn: {
    marginTop: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});

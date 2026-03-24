import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import {
  loadCoachMarkDigest,
  type CoachMarkDigestData,
} from "@/lib/coachMarkDigestHelpers";
import { theme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";

function MetricPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "success" | "warning" | "default";
}) {
  const style =
    variant === "success"
      ? [styles.pill, styles.pillSuccess]
      : variant === "warning"
        ? [styles.pill, styles.pillWarning]
        : styles.pill;
  const valueStyle =
    variant === "success"
      ? [styles.pillValue, styles.pillValueSuccess]
      : variant === "warning"
        ? [styles.pillValue, styles.pillValueWarning]
        : styles.pillValue;
  return (
    <View style={style}>
      <Text style={valueStyle}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function DigestContent({
  data,
  loading,
}: {
  data: CoachMarkDigestData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.activeCard}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Загрузка…</Text>
        </View>
      </View>
    );
  }

  if (!data?.hasData) {
    return (
      <View style={styles.activeCard}>
        <Text style={styles.emptyTitle}>Пока нет сводки</Text>
        <Text style={styles.emptyText}>Запишите тренировку — Coach Mark соберёт данные</Text>
      </View>
    );
  }

  const d = data!;
  return (
    <View style={styles.activeCard}>
      <Text style={styles.activeTitle}>Сводка по команде</Text>
      <View style={styles.pillsRow}>
        <MetricPill
          label="Прогрессируют"
          value={d.progressingCount}
          variant={d.progressingCount > 0 ? "success" : "default"}
        />
        <MetricPill
          label="Требуют внимания"
          value={d.attentionCount}
          variant={d.attentionCount > 0 ? "warning" : "default"}
        />
        <MetricPill label="Готово отчётов" value={d.reportsReadyCount} />
        <MetricPill label="Черновиков родителям" value={d.parentDraftsReadyCount} />
      </View>
      {d.digestLine ? (
        <Text style={styles.digestLine} numberOfLines={2}>
          {d.digestLine}
        </Text>
      ) : null}
    </View>
  );
}

export function CoachMarkDigestBlock() {
  const [data, setData] = useState<CoachMarkDigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCoachMarkDigest().then((d) => {
        setData(d);
        setLoading(false);
      });
    }, [])
  );

  return (
    <View style={styles.wrapper}>
      <DigestContent data={data} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  activeCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  pill: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: 90,
  },
  pillSuccess: {
    backgroundColor: theme.colors.primaryMuted,
  },
  pillWarning: {
    backgroundColor: "rgba(245, 166, 35, 0.12)",
  },
  pillValue: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 2,
  },
  pillValueSuccess: {
    color: theme.colors.primary,
  },
  pillValueWarning: {
    color: theme.colors.warning,
  },
  pillLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  digestLine: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
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
  activeTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
});

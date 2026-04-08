import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/constants/theme";
import type { ParentHockeyIdSummary } from "@/lib/parentHockeyIdSummaryMapper";
import { screenReveal } from "@/lib/animations";

const PRESSED_OPACITY = 0.88;

export type PlayerHockeyIdSummaryCardProps = {
  loading: boolean;
  error: boolean;
  summary: ParentHockeyIdSummary | null;
  onRetry: () => void;
  showHistoryCta?: boolean;
  showFootnote?: boolean;
  disableEnteringAnimation?: boolean;
};

export const PlayerHockeyIdSummaryCard = memo(function PlayerHockeyIdSummaryCard({
  loading,
  error,
  summary,
  onRetry,
  showHistoryCta = true,
  showFootnote = true,
  disableEnteringAnimation = false,
}: PlayerHockeyIdSummaryCardProps) {
  const wrap = (node: React.ReactNode) => {
    if (disableEnteringAnimation) {
      return <View style={styles.card}>{node}</View>;
    }
    return (
      <Animated.View entering={screenReveal(0)} style={styles.card}>
        {node}
      </Animated.View>
    );
  };

  if (loading) {
    return wrap(
      <View style={styles.stateRow}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.stateText}>Загружаем Hockey ID…</Text>
      </View>
    );
  }

  if (error) {
    return wrap(
      <View>
        <Text style={styles.errorText}>
          Не удалось загрузить сводку. Проверьте сеть и попробуйте снова.
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
          accessibilityRole="button"
          accessibilityLabel="Повторить загрузку Hockey ID"
        >
          <Text style={styles.retryBtnText}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  if (!summary) {
    return wrap(
      <Text style={styles.emptyText}>
        Когда появятся записи после занятий, здесь будет короткая сводка по игре — отдельно от
        шкалы оценок ниже.
      </Text>
    );
  }

  return wrap(
    <View>
      <View style={styles.titleRow}>
        <Ionicons name="analytics-outline" size={22} color={colors.accent} />
        <Text style={styles.headline} numberOfLines={3}>
          {summary.headline}
        </Text>
      </View>
      <Text style={styles.supporting} numberOfLines={6}>
        {summary.supporting}
      </Text>
      {showHistoryCta ? (
        <Text style={styles.hintMuted}>
          Полную хронологию можно открыть кнопкой «Динамика во времени».
        </Text>
      ) : null}
      {showFootnote ? (
        <Text style={styles.footnote}>
          Данные формируются после тренировок и игр — только просмотр для родителя.
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
    flex: 1,
  },
  errorText: {
    ...typography.body,
    color: colors.errorText,
    marginBottom: spacing.sm,
  },
  retryBtn: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  retryBtnText: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.accent,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headline: {
    ...typography.cardTitle,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  supporting: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  hintMuted: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 11,
    lineHeight: 16,
  },
});

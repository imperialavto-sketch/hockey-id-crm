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
  getCoachActionItems,
  type CoachActionItem,
} from "@/lib/coachActionHelpers";
import { isEndpointUnavailable, clearEndpointUnavailable, COACH_ENDPOINTS } from "@/lib/endpointAvailability";
import { theme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";

function CoachActionContent({
  items,
  loading,
  onOpenPlayer,
  onAll,
  onRetry,
}: {
  items: CoachActionItem[];
  loading: boolean;
  onOpenPlayer: (playerId: string) => void;
  onAll: () => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <SectionCard elevated style={actionStyles.active}>
        <View style={actionStyles.loading}>
          <ActivityIndicator size="small" color={theme.colors.warning} />
          <Text style={actionStyles.loadingText}>Загрузка…</Text>
        </View>
      </SectionCard>
    );
  }

  if (items.length === 0) {
    const unavailable = isEndpointUnavailable(COACH_ENDPOINTS.ACTIONS);
    return (
      <SectionCard elevated style={actionStyles.active}>
        <Text style={actionStyles.emptyTitle}>
          {unavailable ? 'Модуль действий пока не подключён' : 'Пока нет игроков, требующих внимания'}
        </Text>
        <Text style={actionStyles.emptyText}>
          {unavailable ? 'Когда сервер будет готов, здесь появятся задачи' : 'Запишите тренировку'}
        </Text>
        {unavailable ? (
          <PrimaryButton
            title="Проверить снова"
            variant="outline"
            onPress={onRetry}
            style={actionStyles.allBtn}
          />
        ) : (
          <PrimaryButton
            title="Все"
            variant="outline"
            onPress={onAll}
            style={actionStyles.allBtn}
          />
        )}
      </SectionCard>
    );
  }

  const displayList = items.slice(0, 3);

  return (
    <SectionCard elevated style={actionStyles.active}>
      {displayList.map((item, i) => (
        <Pressable
          key={item.playerId}
          style={({ pressed }) => [
            actionStyles.row,
            i > 0 && actionStyles.rowBorder,
            pressed && actionStyles.pressed,
          ]}
          onPress={() => onOpenPlayer(item.playerId)}
        >
          <View style={actionStyles.rowContent}>
            <Text style={actionStyles.rowName}>{item.playerName}</Text>
            <View style={actionStyles.statusBadge}>
              <Text style={actionStyles.statusText}>{item.status}</Text>
            </View>
            <Text style={actionStyles.actionLine} numberOfLines={2}>
              {item.actionLine}
            </Text>
          </View>
          <PrimaryButton
            title="Открыть"
            variant="ghost"
            onPress={() => onOpenPlayer(item.playerId)}
            style={actionStyles.openBtn}
            textStyle={actionStyles.openBtnText}
          />
        </Pressable>
      ))}
      <PrimaryButton
        title="Все"
        variant="outline"
        onPress={onAll}
        style={actionStyles.allBtn}
      />
    </SectionCard>
  );
}

export function CoachActionBlock() {
  const router = useRouter();
  const [items, setItems] = useState<CoachActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(() => {
    setLoading(true);
    getCoachActionItems()
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => fetchItems(), [fetchItems]));

  const handleRetry = useCallback(() => {
    clearEndpointUnavailable(COACH_ENDPOINTS.ACTIONS);
    fetchItems();
  }, [fetchItems]);

  return (
    <CoachActionContent
      items={items}
      loading={loading}
      onOpenPlayer={(id) => router.push(`/player/${id}`)}
      onAll={() => router.push("/actions")}
      onRetry={handleRetry}
    />
  );
}

const actionStyles = StyleSheet.create({
  active: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  rowName: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    marginBottom: 2,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.warning,
  },
  actionLine: {
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

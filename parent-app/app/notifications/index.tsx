import React, { useState, useCallback, useMemo, memo } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getNotifications, markNotificationAsRead } from "@/services/notificationService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { SkeletonBlock, ErrorStateView, EmptyStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { AppNotificationItem, AppNotificationType } from "@/types/notification";
import {
  navigateFromAppNotificationItem,
  type ParentNotificationRouter,
} from "@/lib/parentNotificationNavigation";

const PRESSED_OPACITY = 0.88;

const TYPE_ICONS: Record<AppNotificationType, keyof typeof Ionicons.glyphMap> = {
  chat_message: "chatbubble-outline",
  parent_chat_message: "chatbubbles-outline",
  parent_peer_message: "people-outline",
  team_parent_channel_message: "people-circle-outline",
  team_announcement: "megaphone-outline",
  coach_mark_post_training: "sparkles-outline",
  schedule_update: "calendar-outline",
  ai_analysis_ready: "sparkles-outline",
  achievement_unlocked: "trophy-outline",
  training_report_published: "document-text-outline",
  player_progress_update: "trending-up-outline",
  general: "notifications-outline",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Сейчас";
  if (diffMins < 60) return `${diffMins} мин`;
  if (diffHours < 24) return `${diffHours} ч`;
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} дн`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const NotificationsSkeleton = memo(function NotificationsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
    </View>
  );
});

const NotificationCard = memo(function NotificationCard({
  item,
  onPress,
}: {
  item: AppNotificationItem;
  onPress: (item: AppNotificationItem) => void;
}) {
  const isUnread = !item.isRead;
  const iconName = TYPE_ICONS[item.type] ?? "notifications-outline";
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.cardUnread,
        pressed && { opacity: PRESSED_OPACITY },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.iconWrap, isUnread && styles.iconWrapUnread]}>
        <Ionicons
          name={iconName}
          size={22}
          color={isUnread ? colors.accent : colors.textMuted}
        />
      </View>
      <View style={styles.cardContent}>
        <Text
          style={[styles.cardTitle, isUnread ? styles.cardTitleUnread : styles.cardTitleRead]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text style={styles.cardBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await getNotifications(user?.id);
      setItems(data);
    } catch {
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleItemPress = useCallback(
    async (item: AppNotificationItem) => {
      triggerHaptic();
      if (!item.isRead) {
        await markNotificationAsRead(item.id, user?.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      }
      navigateFromAppNotificationItem(router as ParentNotificationRouter, item);
    },
    [router, user?.id]
  );

  const handleRetry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  const header = useMemo(
    () => (
      <ScreenHeader
        title="Уведомления"
        subtitle="Активность и обновления"
        onBack={() => {
          triggerHaptic();
          router.back();
        }}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: AppNotificationItem) => item.id, []);

  const listContentStyle = useMemo(
    () => [
      styles.list,
      items.length === 0 ? styles.emptyList : {},
      { paddingBottom: spacing.xxl + insets.bottom + 40 },
    ],
    [items.length, insets.bottom]
  );

  const listEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <EmptyStateView
          icon="notifications-off-outline"
          title="Нет уведомлений"
          subtitle="Здесь появятся сообщения от тренера, изменения расписания и важные обновления"
        />
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: AppNotificationItem; index: number }) => (
      <Animated.View entering={screenReveal(STAGGER + index * 30)}>
        <NotificationCard item={item} onPress={handleItemPress} />
      </Animated.View>
    ),
    [handleItemPress]
  );

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <NotificationsSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (loadError) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить уведомления"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={handleRetry}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={listEmptyComponent}
        renderItem={renderItem}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.md },
  skeletonRow: { borderRadius: radius.lg },

  errorWrap: { flex: 1 },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  emptyList: { flexGrow: 1 },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cardUnread: {
    backgroundColor: "rgba(59,130,246,0.06)",
    borderColor: "rgba(59,130,246,0.12)",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  iconWrapUnread: {
    backgroundColor: colors.accentSoft,
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: {
    ...typography.cardTitle,
    marginBottom: spacing.xs,
  },
  cardTitleUnread: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  cardTitleRead: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  cardBody: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  cardTime: {
    ...typography.captionSmall,
    color: colors.textMuted,
  },
});

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getNotifications, markNotificationAsRead } from "@/services/notificationService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { AppNotificationItem, AppNotificationType } from "@/types/notification";

const PRESSED_OPACITY = 0.88;

const TYPE_ICONS: Record<AppNotificationType, keyof typeof Ionicons.glyphMap> = {
  chat_message: "chatbubble-outline",
  schedule_update: "calendar-outline",
  ai_analysis_ready: "sparkles-outline",
  achievement_unlocked: "trophy-outline",
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

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  item: AppNotificationItem
) {
  const { type, data } = item;
  switch (type) {
    case "chat_message":
      if (data?.conversationId) router.push(`/chat/${data.conversationId}`);
      break;
    case "schedule_update":
      router.push("/(tabs)/schedule");
      break;
    case "ai_analysis_ready":
    case "achievement_unlocked":
      if (data?.playerId) router.push(`/player/${data.playerId}`);
      else router.push("/(tabs)");
      break;
    default:
      router.push("/(tabs)");
      break;
  }
}

function NotificationsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
      <SkeletonBlock height={96} style={styles.skeletonRow} />
    </View>
  );
}

function NotificationCard({
  item,
  onPress,
}: {
  item: AppNotificationItem;
  onPress: () => void;
}) {
  const isUnread = !item.isRead;
  const iconName = TYPE_ICONS[item.type] ?? "notifications-outline";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.cardUnread,
        pressed && { opacity: PRESSED_OPACITY },
      ]}
      onPress={onPress}
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
}

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
      navigateFromNotification(router, item);
    },
    [router, user?.id]
  );

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <View style={styles.headerCenter}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="notifications-outline" size={24} color={colors.accent} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Уведомления</Text>
          <Text style={styles.headerSub}>Активность и обновления</Text>
        </View>
      </View>
      <View style={styles.backBtn} />
    </View>
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
          onAction={() => {
            setLoading(true);
            load();
          }}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  const listBottomPadding = spacing.xxl + insets.bottom + 40;

  return (
    <FlagshipScreen header={header} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          items.length === 0 ? styles.emptyList : {},
          { paddingBottom: listBottomPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Нет уведомлений</Text>
            <Text style={styles.emptySub}>
              Здесь появятся сообщения от тренера, изменения расписания и важные обновления
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={screenReveal(STAGGER + index * 30)}>
            <NotificationCard item={item} onPress={() => handleItemPress(item)} />
          </Animated.View>
        )}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },

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
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    marginBottom: spacing.sm,
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
    color: colors.text,
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

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
  },
});

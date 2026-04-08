import { memo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing, typography, sectionIcon, textOnGlass } from "@/constants/theme";
import { GlassCardV2 } from "@/components/ui/GlassCardV2";
import { SectionIconBadge } from "@/components/ui/SectionIconBadge";
import { PressableScale } from "@/components/ui/PressableScale";
import type { AppNotificationItem, AppNotificationType } from "@/types/notification";

const TYPE_ICONS: Record<AppNotificationType, keyof typeof Ionicons.glyphMap> = {
  chat_message: "chatbubble-outline",
  parent_chat_message: "chatbubbles-outline",
  team_announcement: "megaphone-outline",
  coach_mark_post_training: "sparkles-outline",
  schedule_update: "calendar-outline",
  ai_analysis_ready: "sparkles-outline",
  achievement_unlocked: "trophy-outline",
  training_report_published: "document-text-outline",
  player_progress_update: "trending-up-outline",
  general: "notifications-outline",
};

/** Время для подписи карточки (относительное, RU). */
export function formatNotificationCardTime(iso: string): string {
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

/**
 * Карточка уведомления в списке (`app/notifications/index.tsx`).
 * Storybook: `NotificationCard.stories.tsx`.
 */
export type NotificationCardProps = {
  item: AppNotificationItem;
  onPress: (item: AppNotificationItem) => void;
};

export const NotificationCard = memo(function NotificationCard({
  item,
  onPress,
}: NotificationCardProps) {
  const isUnread = !item.isRead;
  const iconName = TYPE_ICONS[item.type] ?? "notifications-outline";
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const kindLine =
    item.type === "chat_message"
      ? "Личное сообщение"
      : item.type === "team_announcement"
        ? "Команда"
        : item.type === "coach_mark_post_training"
          ? "Арена · AI"
          : null;

  const a11yLabel = [
    kindLine,
    item.title,
    item.body,
    formatNotificationCardTime(item.createdAt),
    isUnread ? "непрочитано" : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Открыть связанный экран"
      style={styles.cardWrap}
      scale={0.99}
      onPress={handlePress}
    >
      <GlassCardV2
        variant={isUnread ? "highlight" : "default"}
        padding="none"
        style={styles.cardGlass}
        contentStyle={styles.cardInner}
      >
        <View style={styles.iconSlot}>
          <SectionIconBadge
            name={iconName}
            size="md"
            variant={isUnread ? "accent" : "default"}
          />
        </View>
        <View style={styles.cardContent}>
          {kindLine ? (
            <Text style={styles.cardKind} numberOfLines={1}>
              {kindLine}
            </Text>
          ) : null}
          <Text
            style={[styles.cardTitle, isUnread ? styles.cardTitleUnread : styles.cardTitleRead]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={styles.cardBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.cardTime}>{formatNotificationCardTime(item.createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={sectionIcon.color} />
      </GlassCardV2>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  cardWrap: {
    marginBottom: spacing.sectionGap,
  },
  cardGlass: {
    marginBottom: 0,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  iconSlot: {
    marginRight: spacing.lg,
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardKind: {
    ...typography.captionSmall,
    color: textOnGlass.meta,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  cardTitle: {
    ...typography.cardTitle,
    marginBottom: spacing.xs,
  },
  cardTitleUnread: {
    color: textOnGlass.heading,
    fontWeight: "700",
  },
  cardTitleRead: {
    color: textOnGlass.secondary,
    fontWeight: "600",
  },
  cardBody: {
    ...typography.bodySmall,
    color: textOnGlass.meta,
    marginBottom: spacing.xs,
  },
  cardTime: {
    ...typography.captionSmall,
    color: textOnGlass.meta,
  },
});

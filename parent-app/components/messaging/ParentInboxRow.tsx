import { memo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { listItemReveal } from "@/lib/animations";
import { colors, spacing, typography, glassVisual, textOnGlass } from "@/constants/theme";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { SectionIconBadge } from "@/components/ui/SectionIconBadge";
import {
  CHAT_INBOX_COPY,
  formatConversationListTime,
} from "@/lib/parentChatInboxUi";
import type { ParentInboxItem } from "@/lib/parentInboxModel";

const PRESSED_OPACITY = 0.88;

const INBOX_CARD_GLOW = {
  shadowColor: "#2F80FF",
  shadowOpacity: 0.36,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 14,
} as const;

export type ParentInboxRowProps = {
  item: ParentInboxItem;
  index: number;
  onPress: (item: ParentInboxItem) => void;
};

export const ParentInboxRow = memo(function ParentInboxRow({
  item,
  index,
  onPress,
}: ParentInboxRowProps) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const isAi = item.kind === "coach_mark_ai";
  const isTeam = item.kind === "team_announcements";
  const isMessenger = item.kind === "messenger_thread";
  const isAnnouncementMessenger =
    isMessenger && item.messengerKind === "team_announcement_channel";
  const unreadDot =
    (item.kind === "direct_parent_coach" ||
      item.kind === "team_announcements" ||
      isMessenger) &&
    item.unreadCount > 0;

  const timeStr = formatConversationListTime(item.updatedAt);

  const messengerKindLabel = (k: string) => {
    switch (k) {
      case "parent_parent_direct":
        return "С родителем";
      case "team_parent_channel":
        return CHAT_INBOX_COPY.teamParentChannelThreadTitle;
      case "team_announcement_channel":
        return "Объявления команды";
      default:
        return "Сообщения";
    }
  };

  const typeLabel = isAi
    ? "Арена — рекомендации"
    : isTeam
      ? "Объявления команды"
      : isMessenger
        ? messengerKindLabel(item.messengerKind)
        : "Чат с тренером";

  const unreadLine =
    unreadDot && typeof item.unreadCount === "number" && item.unreadCount > 0
      ? `Непрочитанных сообщений: ${item.unreadCount}`
      : unreadDot
        ? "Есть непрочитанное"
        : "";

  const a11yLabel = [item.title, item.preview, timeStr, unreadLine]
    .filter(Boolean)
    .join(". ");

  return (
    <Animated.View style={styles.rowWrap} entering={listItemReveal(index)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Открыть переписку"
        style={({ pressed }) => [pressed ? { opacity: PRESSED_OPACITY } : undefined]}
        onPress={handlePress}
      >
        <GlassSurface
          variant="large"
          textComfortTint
          style={[
            INBOX_CARD_GLOW,
            isAi && styles.glassAccentAi,
            isTeam && styles.glassAccentTeam,
            isAnnouncementMessenger && styles.glassAccentAnnouncement,
          ]}
        >
          <View style={styles.cardInner}>
            <LinearGradient
              colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.02)", "transparent"]}
              locations={[0, 0.35, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.innerTopShine}
              pointerEvents="none"
            />
            <View style={styles.row}>
              <View style={styles.avatarSlot}>
                <SectionIconBadge
                  name={
                    isAi
                      ? "sparkles"
                      : isTeam
                        ? "megaphone-outline"
                        : isAnnouncementMessenger
                          ? "newspaper-outline"
                          : isMessenger
                            ? "chatbubbles-outline"
                            : "person"
                  }
                  size="md"
                  variant={isAi ? "accent" : "default"}
                />
              </View>
              <View style={styles.rowContent}>
                <View style={styles.rowTopLine}>
                  <View style={styles.rowTitleBlock}>
                    <View style={styles.rowTitleRow}>
                      <Text
                        style={[styles.title, isAi ? styles.titleCoachMark : undefined]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.showAiBadge ? (
                        <View style={styles.aiBadge}>
                          <Text style={styles.aiBadgeText}>AI</Text>
                        </View>
                      ) : null}
                      {unreadDot ? (
                        <View
                          style={styles.unreadDot}
                          accessible
                          accessibilityRole="text"
                          accessibilityLabel={
                            typeof item.unreadCount === "number" && item.unreadCount > 0
                              ? `Индикатор: ${item.unreadCount} непрочитанных`
                              : "Индикатор непрочитанного"
                          }
                        />
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.time}>{timeStr}</Text>
                </View>
                <Text style={styles.typeLabel}>{typeLabel}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
                <Text style={styles.preview} numberOfLines={2}>
                  {item.preview}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(230,240,255,0.72)" />
            </View>
          </View>
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
});

const BR = glassVisual.shellLarge.borderRadius as number;

const styles = StyleSheet.create({
  rowWrap: {
    marginBottom: spacing.xl,
  },
  glassAccentAi: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  glassAccentTeam: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(148,163,184,0.55)",
  },
  glassAccentAnnouncement: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(212,175,55,0.82)",
  },
  cardInner: {
    position: "relative",
    overflow: "hidden",
    borderRadius: BR,
  },
  innerTopShine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 72,
    borderTopLeftRadius: BR,
    borderTopRightRadius: BR,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 17,
    paddingHorizontal: 17,
  },
  avatarSlot: {
    marginRight: spacing.lg,
    alignSelf: "center",
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rowTitleBlock: { flex: 1, minWidth: 0 },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "nowrap",
  },
  title: {
    ...typography.cardTitle,
    fontSize: 17,
    fontWeight: "700",
    color: textOnGlass.heading,
    flexShrink: 1,
  },
  titleCoachMark: {
    color: colors.accentBright,
  },
  aiBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(59,130,246,0.28)",
    flexShrink: 0,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentBright,
    letterSpacing: 0.4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    flexShrink: 0,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: textOnGlass.meta,
    marginTop: 4,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 13,
    color: textOnGlass.secondary,
    marginTop: 4,
  },
  preview: {
    ...typography.bodySmall,
    fontSize: 14,
    color: textOnGlass.meta,
    marginTop: 6,
    lineHeight: 20,
  },
  time: {
    ...typography.caption,
    fontSize: 12,
    color: textOnGlass.meta,
    marginTop: 2,
    flexShrink: 0,
    opacity: 0.92,
  },
});

import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Heart, MessageCircle, Pin } from "lucide-react-native";
import { colors, cardStyles, radii, spacing, typography, feedback } from "@/constants/theme";
import type { TeamPost } from "@/types/team";

const ROLE_LABELS: Record<string, string> = {
  coach: "Тренер",
  assistant_coach: "Ассистент",
  parent: "Родитель",
  player: "Игрок",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 60) return `${diffM} мин назад`;
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

interface TeamPostCardProps {
  post: TeamPost;
  onPress?: () => void;
  onCommentPress?: () => void;
}

export function TeamPostCard({ post, onPress, onCommentPress }: TeamPostCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          {post.author.avatarUrl ? (
            <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>{post.author.name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{post.author.name}</Text>
            {post.isPinned && (
              <Pin size={14} color={colors.textMuted} style={styles.pin} />
            )}
          </View>
          <Text style={styles.role}>
            {ROLE_LABELS[post.author.role] ?? post.author.role}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(post.createdAt)}</Text>
      </View>
      <Text style={styles.text}>{post.text}</Text>
      {post.matchResult && (
        <View style={styles.matchBlock}>
          <Text style={styles.matchScore}>
            {post.matchResult.teamHome} {post.matchResult.scoreHome} :{" "}
            {post.matchResult.scoreAway} {post.matchResult.teamAway}
          </Text>
          {post.matchResult.bestPlayer && (
            <Text style={styles.bestPlayer}>
              Лучший игрок: {post.matchResult.bestPlayer}
            </Text>
          )}
        </View>
      )}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      {post.event && (
        <View style={styles.eventBlock}>
          <Text style={styles.eventTitle}>{post.event.title}</Text>
          <Text style={styles.eventMeta}>
            {post.event.date} {post.event.time && `• ${post.event.time}`}
          </Text>
          {post.event.location && (
            <Text style={styles.eventLocation}>{post.event.location}</Text>
          )}
        </View>
      )}
      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <Heart size={18} color={colors.textMuted} />
          <Text style={styles.actionText}>{post.likesCount}</Text>
        </View>
        <Pressable
          style={styles.actionItem}
          onPress={(e) => {
            e?.stopPropagation?.();
            onCommentPress?.();
          }}
        >
          <MessageCircle size={18} color={colors.textMuted} />
          <Text style={styles.actionText}>{post.commentsCount}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardStyles.backgroundColor,
    borderRadius: cardStyles.radius,
    padding: cardStyles.padding,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: cardStyles.borderWidth,
    borderColor: cardStyles.borderColor,
  },
  cardPressed: { opacity: feedback.pressedOpacity },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatarWrap: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    ...typography.body,
    fontWeight: "700",
    color: colors.accent,
  },
  meta: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  pin: { marginLeft: 2 },
  role: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
  },
  text: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  matchBlock: {
    padding: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchScore: {
    ...typography.body,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bestPlayer: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  eventBlock: {
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  eventTitle: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  eventMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  eventLocation: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

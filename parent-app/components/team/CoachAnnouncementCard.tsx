import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, radii, spacing, typography, feedback } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";
import type { TeamPost } from "@/types/team";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CoachAnnouncementCardProps {
  post: TeamPost;
  onPress?: () => void;
  /** When true, removes horizontal margin for embedded use (e.g. detail screen) */
  embedded?: boolean;
}

export function CoachAnnouncementCard({ post, onPress, embedded }: CoachAnnouncementCardProps) {
  const handlePress = () => {
    triggerHaptic();
    onPress?.();
  };

  const cardContent = (
    <>
      <View style={styles.badge}>
        <Ionicons name="megaphone-outline" size={16} color={colors.accent} />
        <Text style={styles.badgeText}>Объявление тренера</Text>
      </View>
      <Text style={styles.author}>Тренер {post.author.name}</Text>
      <Text style={styles.text}>"{post.text}"</Text>
      <Text style={styles.date}>{formatDate(post.createdAt)}</Text>
    </>
  );

  const cardStyle = [styles.card, embedded && styles.cardEmbedded];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...cardStyle, pressed && { opacity: feedback.pressedOpacity }]}
        onPress={handlePress}
      >
        {cardContent}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{cardContent}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  cardEmbedded: {
    marginHorizontal: 0,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.accent,
  },
  author: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
    fontStyle: "italic",
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});

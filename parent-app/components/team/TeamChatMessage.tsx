import React, { memo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors, spacing, typography, radius, radii } from "@/constants/theme";
import type { TeamMessage } from "@/types/team";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

interface TeamChatMessageProps {
  message: TeamMessage;
  isCurrentUser?: boolean;
}

export const TeamChatMessage = memo(function TeamChatMessage({
  message,
  isCurrentUser,
}: TeamChatMessageProps) {
  const isCoach = message.authorRole === "coach" || message.authorRole === "assistant_coach";
  const isSystem = message.type === "system";

  if (isSystem) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        isCurrentUser && styles.wrapRight,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isCoach && styles.bubbleCoach,
          isCurrentUser && styles.bubbleRight,
        ]}
      >
        {!isCurrentUser && (
          <Text style={styles.authorName}>{message.authorName}</Text>
        )}
        {message.imageUrl ? (
          <Image
            source={{ uri: message.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : null}
        <Text
          style={[
            styles.text,
            isCoach && styles.textCoach,
          ]}
        >
          {message.text}
        </Text>
        <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    marginBottom: spacing.md,
  },
  wrapRight: {
    alignSelf: "flex-end",
  },
  bubble: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radii.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  bubbleCoach: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(59,130,246,0.25)",
  },
  bubbleRight: {
    backgroundColor: colors.accentSoft,
    borderColor: "rgba(59,130,246,0.25)",
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radii.xs,
  },
  authorName: {
    ...typography.captionSmall,
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  text: {
    ...typography.bodySmall,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  textCoach: {
    color: colors.text,
  },
  time: {
    ...typography.captionSmall,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: radius.sm,
    marginVertical: spacing.sm,
  },
  systemWrap: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  systemText: {
    ...typography.captionSmall,
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});

import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";
import type { TeamMessage } from "@/types/team";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

interface TeamChatMessageProps {
  message: TeamMessage;
  isCurrentUser?: boolean;
}

export function TeamChatMessage({ message, isCurrentUser }: TeamChatMessageProps) {
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
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  wrapRight: {
    alignSelf: "flex-end",
  },
  bubble: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  bubbleCoach: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  bubbleRight: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  authorName: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    color: "#E2E8F0",
    lineHeight: 22,
  },
  textCoach: {
    color: "#F8FAFC",
  },
  time: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 6,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginVertical: 8,
  },
  systemWrap: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  systemText: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
  },
});

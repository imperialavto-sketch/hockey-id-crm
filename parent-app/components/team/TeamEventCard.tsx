import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Calendar, MapPin } from "lucide-react-native";
import { colors, cardStyles, radii, spacing, typography, feedback } from "@/constants/theme";
import type { TeamEvent } from "@/types/team";

const TYPE_LABELS: Record<string, string> = {
  training: "Тренировка",
  match: "Матч",
  tournament: "Турнир",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

interface TeamEventCardProps {
  event: TeamEvent;
  onPress?: () => void;
}

export function TeamEventCard({ event, onPress }: TeamEventCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.dateBlock}>
        <Calendar size={18} color={colors.accent} />
        <Text style={styles.dateText}>{formatDate(event.date)}</Text>
      </View>
      <Text style={styles.title}>{event.title}</Text>
      {event.time && <Text style={styles.time}>{event.time}</Text>}
      {event.location && (
        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.textMuted} />
          <Text style={styles.location}>{event.location}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardStyles.backgroundColor,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: cardStyles.borderWidth,
    borderColor: cardStyles.borderColor,
  },
  cardPressed: { opacity: feedback.pressedOpacity },
  dateBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
  },
  title: {
    ...typography.section,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  time: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  location: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

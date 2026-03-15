import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "@/constants/theme";

interface BookingSummaryCardProps {
  coachName: string;
  coachPhoto?: string;
  specialization: string;
  date: string;
  time: string;
  duration: number;
  format: string;
  playerName: string;
  price: number;
}

export function BookingSummaryCard({
  coachName,
  coachPhoto,
  specialization,
  date,
  time,
  duration,
  format,
  playerName,
  price,
}: BookingSummaryCardProps) {
  const dateFormatted = date
    ? new Date(date + "T12:00:00").toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      })
    : "—";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {coachPhoto ? (
          <Image source={{ uri: coachPhoto }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{coachName}</Text>
          <Text style={styles.spec}>{specialization}</Text>
        </View>
        <Text style={styles.price}>{price.toLocaleString("ru")} ₽</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.detail}>
          {dateFormatted} · {time}
        </Text>
        <Text style={styles.detail}>
          {duration} мин · {format}
        </Text>
        <Text style={styles.detail}>Игрок: {playerName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    marginRight: spacing.lg,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    ...typography.cardTitle,
    color: colors.text,
  },
  spec: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  price: {
    ...typography.cardTitle,
    fontSize: 18,
    color: colors.accent,
  },
  details: {
    gap: spacing.xs,
  },
  detail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

const PRESSED_OPACITY = 0.88;

interface EmptyBookingsStateProps {
  onFindCoach: () => void;
}

export function EmptyBookingsState({ onFindCoach }: EmptyBookingsStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>Нет бронирований</Text>
      <Text style={styles.desc}>
        Забронируйте индивидуальную тренировку у лучших тренеров
      </Text>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          onFindCoach();
        }}
      >
        <Ionicons name="search-outline" size={20} color="#ffffff" />
        <Text style={styles.ctaText}>Найти тренера</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  desc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  ctaText: {
    ...typography.body,
    fontWeight: "700",
    color: "#ffffff",
  },
});

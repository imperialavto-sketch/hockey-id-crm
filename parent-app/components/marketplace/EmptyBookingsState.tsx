import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";
import { PrimaryButton } from "@/components/ui";

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
      <PrimaryButton
        label="Найти тренера"
        onPress={() => {
          triggerHaptic();
          onFindCoach();
        }}
      />
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
});

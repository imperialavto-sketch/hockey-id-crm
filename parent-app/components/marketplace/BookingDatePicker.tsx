import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";

interface BookingDatePickerProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  minDaysFromNow?: number;
  daysToShow?: number;
}

function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function BookingDatePicker({
  selectedDate,
  onSelect,
  minDaysFromNow = 0,
  daysToShow = 14,
}: BookingDatePickerProps) {
  const dates: { key: string; label: string; weekday: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = minDaysFromNow; i < minDaysFromNow + daysToShow; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = formatDateKey(d);
    const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    dates.push({
      key,
      label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
      weekday: weekdays[d.getDay()],
    });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.wrap}
    >
      {dates.map((d) => {
        const isSelected = selectedDate === d.key;
        return (
          <Pressable
            key={d.key}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipActive,
              pressed && { opacity: 0.88 },
            ]}
            onPress={() => {
              triggerHaptic();
              onSelect(d.key);
            }}
          >
            <Text style={[styles.weekday, isSelected && styles.textActive]}>
              {d.weekday}
            </Text>
            <Text style={[styles.date, isSelected && styles.textActive]}>
              {d.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  chip: {
    width: 64,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  weekday: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  date: {
    ...typography.bodySmall,
    fontWeight: "700",
    color: colors.text,
  },
  textActive: {
    color: colors.accent,
  },
});

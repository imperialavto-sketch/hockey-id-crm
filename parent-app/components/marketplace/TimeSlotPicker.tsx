import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";

interface Slot {
  time: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  slots: Slot[];
  selectedTime: string;
  onSelect: (time: string) => void;
}

export function TimeSlotPicker({ slots, selectedTime, onSelect }: TimeSlotPickerProps) {
  const availableSlots = slots.filter((s) => s.available);

  return (
    <View style={styles.wrap}>
      {availableSlots.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="time-outline" size={32} color={colors.textMuted} />
          <Text style={styles.empty}>Нет свободных слотов на эту дату</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {availableSlots.map((s) => {
            const isSelected = selectedTime === s.time;
            return (
              <Pressable
                key={s.time}
                style={({ pressed }) => [
                  styles.slot,
                  isSelected && styles.slotActive,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => {
                  triggerHaptic();
                  onSelect(s.time);
                }}
              >
                <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                  {s.time}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slot: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  slotActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  slotText: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.text,
  },
  slotTextActive: {
    color: colors.accent,
  },
  emptyWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  empty: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});

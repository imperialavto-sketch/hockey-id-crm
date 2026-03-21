import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

interface ScheduleItemRowProps {
  day: string;
  title: string;
  time: string;
  isLast?: boolean;
  /** Muted styling for rest days (e.g. "Выходной") */
  muted?: boolean;
}

export const ScheduleItemRow = memo(function ScheduleItemRow({ day, title, time, isLast, muted }: ScheduleItemRowProps) {
  return (
    <View style={[styles.row, isLast && styles.rowLast, muted && styles.rowMuted]}>
      <Text style={[styles.day, muted && styles.dayMuted]}>{day}</Text>
      <View style={styles.detail}>
        <Text style={[styles.title, muted && styles.titleMuted]}>{title}</Text>
        {time && time !== "—" && <Text style={styles.time}>{time}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowMuted: { opacity: 0.85 },
  day: {
    ...typography.bodySmall,
    fontWeight: "600",
    color: colors.text,
    width: 76,
  },
  dayMuted: { color: colors.textSecondary },
  detail: {
    flex: 1,
  },
  title: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  titleMuted: { color: colors.textMuted },
  time: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

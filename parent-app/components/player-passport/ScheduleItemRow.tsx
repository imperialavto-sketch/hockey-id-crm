import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

interface ScheduleItemRowProps {
  day: string;
  title: string;
  time: string;
  subtitle?: string;
  /** Посещаемость (был / не был) */
  attendance?: string;
  isLast?: boolean;
  /** Muted styling for rest days (e.g. "Выходной") */
  muted?: boolean;
}

export const ScheduleItemRow = memo(function ScheduleItemRow({
  day,
  title,
  time,
  subtitle,
  attendance,
  isLast,
  muted,
}: ScheduleItemRowProps) {
  return (
    <View style={[styles.row, isLast && styles.rowLast, muted && styles.rowMuted]}>
      <View style={styles.dayWrap}>
        <Text style={[styles.day, muted && styles.dayMuted]} numberOfLines={2}>
          {day}
        </Text>
      </View>
      <View style={styles.detail}>
        <Text style={[styles.title, muted && styles.titleMuted]}>{title}</Text>
        {time && time !== "—" && <Text style={styles.time}>{time}</Text>}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {attendance ? <Text style={styles.attendance}>{attendance}</Text> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowMuted: { opacity: 0.88 },
  dayWrap: {
    width: 80,
    paddingRight: spacing.sm,
    justifyContent: "center",
    minHeight: 24,
  },
  day: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: "700",
    color: colors.accentBright,
    letterSpacing: 0.2,
  },
  dayMuted: { color: colors.textMuted, fontWeight: "600" },
  detail: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    color: colors.text,
  },
  titleMuted: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textMuted,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  attendance: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

import { View, Text, StyleSheet } from "react-native";

const MONTH_NAMES = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

interface ProgressTimelineCardProps {
  month: number;
  year: number;
  games: number;
  goals: number;
  assists: number;
  points: number;
  trend?: "up" | "stable" | "down";
  attendancePercent?: number;
  coachComment?: string;
  focusArea?: string;
}

function getMonthName(month: number): string {
  return MONTH_NAMES[month] ?? String(month);
}

export function ProgressTimelineCard({
  month,
  year,
  games,
  goals,
  assists,
  points,
  trend,
  attendancePercent,
  coachComment,
  focusArea,
}: ProgressTimelineCardProps) {
  const trendLabel =
    trend === "up" ? "Рост" : trend === "stable" ? "Стабильно" : trend === "down" ? "Спад" : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.period}>
          {getMonthName(month)} {year}
        </Text>
        {trendLabel && (
          <View
            style={[
              styles.trendBadge,
              trend === "up" && styles.trendUp,
              trend === "stable" && styles.trendStable,
              trend === "down" && styles.trendDown,
            ]}
          >
            <Text style={styles.trendText}>{trendLabel}</Text>
          </View>
        )}
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Игры: {games}</Text>
        <Text style={styles.stat}>Голы: {goals}</Text>
        <Text style={styles.stat}>Передачи: {assists}</Text>
        <Text style={styles.stat}>Очки: {points}</Text>
      </View>
      {attendancePercent != null && (
        <Text style={styles.attendance}>Посещаемость: {attendancePercent}%</Text>
      )}
      {coachComment ? (
        <Text style={styles.comment}>{coachComment}</Text>
      ) : null}
      {focusArea ? (
        <Text style={styles.focus}>Фокус: {focusArea}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  period: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendUp: { backgroundColor: "rgba(34, 197, 94, 0.25)" },
  trendStable: { backgroundColor: "rgba(234, 179, 8, 0.25)" },
  trendDown: { backgroundColor: "rgba(239, 68, 68, 0.25)" },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  stat: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  attendance: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 6,
  },
  comment: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
    marginBottom: 4,
  },
  focus: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    fontStyle: "italic",
  },
});

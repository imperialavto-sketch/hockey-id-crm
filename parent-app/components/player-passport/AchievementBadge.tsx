import { View, Text, StyleSheet } from "react-native";
import { colors, typography, radius } from "@/constants/theme";

const BADGE_EMOJI: Record<string, string> = {
  goal: "🏒",
  target: "🎯",
  users: "👥",
  star: "⭐",
  shield: "🛡️",
  fire: "🔥",
  trophy: "🏆",
};

interface AchievementBadgeProps {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressValue?: number;
  conditionValue?: number;
}

function getBadgeEmoji(icon: string): string {
  return BADGE_EMOJI[icon] ?? "🏅";
}

export function AchievementBadge({
  icon,
  title,
  description,
  unlocked,
  progressValue,
  conditionValue,
}: AchievementBadgeProps) {
  return (
    <View style={[styles.badge, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
      <Text style={[styles.icon, !unlocked && styles.iconLocked]}>
        {getBadgeEmoji(icon)}
      </Text>
      <Text style={[styles.title, !unlocked && styles.titleLocked]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.desc, !unlocked && styles.descLocked]} numberOfLines={2}>
        {description}
      </Text>
      {!unlocked && progressValue != null && conditionValue != null && (
        <Text style={styles.progress}>
          {progressValue} из {conditionValue}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 120,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
  },
  badgeUnlocked: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(57,217,138,0.35)",
  },
  badgeLocked: {
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  iconLocked: {
    opacity: 0.6,
  },
  title: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  titleLocked: {
    color: colors.textSecondary,
  },
  desc: {
    ...typography.captionSmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  descLocked: {
    color: colors.textMuted,
  },
  progress: {
    ...typography.captionSmall,
    fontWeight: "700",
    color: colors.accent,
    marginTop: 6,
  },
});

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Trophy,
  Dumbbell,
  BarChart3,
  MessageSquare,
  Video,
  Users,
  HeartPulse,
} from "lucide-react-native";
import type { DevelopmentEvent, DevelopmentEventType } from "@/constants/mockDevelopmentTimeline";
import { colors } from "@/constants/theme";
import { timelineDotGlow } from "@/theme/designSystem";

const EVENT_CONFIG: Record<
  DevelopmentEventType,
  {
    Icon: React.ElementType;
    color: string;
    accent: string;
    gradient: [string, string];
    label: string;
  }
> = {
  achievement: {
    Icon: Trophy,
    color: "#FBBF24",
    accent: "rgba(251,191,36,0.25)",
    gradient: ["rgba(251,191,36,0.18)", "rgba(245,158,11,0.06)"],
    label: "Достижение",
  },
  training: {
    Icon: Dumbbell,
    color: colors.accent,
    accent: colors.accentSoft,
    gradient: [colors.accentSoft, "rgba(37,99,235,0.08)"],
    label: "Тренировка",
  },
  stats: {
    Icon: BarChart3,
    color: "#22C55E",
    accent: "rgba(34,197,94,0.25)",
    gradient: ["rgba(34,197,94,0.18)", "rgba(16,185,129,0.08)"],
    label: "Аналитика",
  },
  coach_note: {
    Icon: MessageSquare,
    color: "#3B82F6",
    accent: "rgba(59,130,246,0.25)",
    gradient: ["rgba(59,130,246,0.18)", "rgba(37,99,235,0.08)"],
    label: "Тренер",
  },
  video_analysis: {
    Icon: Video,
    color: "#A78BFA",
    accent: "rgba(167,139,250,0.25)",
    gradient: ["rgba(167,139,250,0.18)", "rgba(139,92,246,0.08)"],
    label: "Видеоанализ",
  },
  team_change: {
    Icon: Users,
    color: "#F59E0B",
    accent: "rgba(245,158,11,0.25)",
    gradient: ["rgba(245,158,11,0.18)", "rgba(217,119,6,0.08)"],
    label: "Команда",
  },
  medical: {
    Icon: HeartPulse,
    color: "#EF4444",
    accent: "rgba(239,68,68,0.25)",
    gradient: ["rgba(239,68,68,0.18)", "rgba(220,38,38,0.08)"],
    label: "Медицина",
  },
};

interface DevelopmentEventCardProps {
  event: DevelopmentEvent;
  isLast?: boolean;
  index: number;
}

export function DevelopmentEventCard({
  event,
  isLast = false,
  index,
}: DevelopmentEventCardProps) {
  const cfg = EVENT_CONFIG[event.type];

  const content = (
    <View style={styles.cardInner}>
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />
      <View style={[styles.iconWrap, { backgroundColor: cfg.accent }]}>
        <cfg.Icon size={20} color={cfg.color} strokeWidth={2.5} />
      </View>
      <View style={styles.body}>
        <View style={styles.typeRow}>
          <Text style={[styles.typeLabel, { color: cfg.color }]}>
            {cfg.label}
          </Text>
          {event.badge && (
            <View style={[styles.badge, { borderColor: cfg.color }]}>
              <Text style={[styles.badgeText, { color: cfg.color }]}>
                {event.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.date}>{event.date}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.desc}>{event.description}</Text>
        {event.metric && (
          <View style={[styles.metricWrap, { backgroundColor: cfg.accent }]}>
            <Text style={[styles.metric, { color: cfg.color }]}>
              {event.metric}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.wrap}
    >
      <View style={styles.lineWrap}>
        <View
          style={[
            styles.dot,
            { backgroundColor: cfg.color },
            event.type === "achievement" && styles.dotGlowGold,
            event.type === "coach_note" && styles.dotGlowBlue,
            (event.type === "stats" || event.type === "training") && styles.dotGlowGreen,
          ]}
        />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.cardWrap}>
        {Platform.OS === "web" ? (
          <View style={[styles.card, styles.cardWeb]}>{content}</View>
        ) : (
          <BlurView intensity={28} tint="dark" style={styles.card}>
            {content}
          </BlurView>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    marginBottom: 16,
  },
  lineWrap: {
    width: 32,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#0B1220",
    zIndex: 1,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -4,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardWrap: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
  },
  cardWeb: {
    backgroundColor: "rgba(8,16,28,0.92)",
  },
  cardInner: {
    flexDirection: "row",
    padding: 18,
    paddingLeft: 0,
  },
  accentBar: {
    width: 4,
    marginRight: 16,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  dotGlowGold: {
    shadowColor: timelineDotGlow.achievement.shadowColor,
    shadowOpacity: timelineDotGlow.achievement.shadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  dotGlowBlue: {
    shadowColor: timelineDotGlow.coach.shadowColor,
    shadowOpacity: timelineDotGlow.coach.shadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  dotGlowGreen: {
    shadowColor: timelineDotGlow.skill.shadowColor,
    shadowOpacity: timelineDotGlow.skill.shadowOpacity,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  body: {
    flex: 1,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  date: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  desc: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.05,
  },
  metricWrap: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metric: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
});

import React, { useRef, useEffect } from "react";
import { colors } from "@/constants/theme";
import { timelineDotGlow } from "@/theme/designSystem";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ImageBackground,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Trophy,
  MessageSquare,
  TrendingUp,
  Video,
  Sparkles,
} from "lucide-react-native";
import type { TimelineEvent, TimelineEventType } from "@/constants/mockTimeline";

const EVENT_CONFIG: Record<
  TimelineEventType,
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
    accent: "rgba(251,191,36,0.3)",
    gradient: ["rgba(251,191,36,0.25)", "rgba(245,158,11,0.1)"],
    label: "Achievement",
  },
  coach_note: {
    Icon: MessageSquare,
    color: "#3B82F6",
    accent: "rgba(59,130,246,0.28)",
    gradient: ["rgba(59,130,246,0.2)", "rgba(37,99,235,0.08)"],
    label: "Coach",
  },
  skill_progress: {
    Icon: TrendingUp,
    color: "#22C55E",
    accent: "rgba(34,197,94,0.28)",
    gradient: ["rgba(34,197,94,0.2)", "rgba(16,185,129,0.08)"],
    label: "Skill",
  },
  video: {
    Icon: Video,
    color: "#EF4444",
    accent: "rgba(239,68,68,0.3)",
    gradient: ["rgba(239,68,68,0.2)", "rgba(220,38,38,0.08)"],
    label: "Video",
  },
  ai_insight: {
    Icon: Sparkles,
    color: "#A78BFA",
    accent: "rgba(167,139,250,0.3)",
    gradient: ["rgba(167,139,250,0.22)", "rgba(139,92,246,0.1)"],
    label: "AI",
  },
};

interface TimelineEventCardProps {
  event: TimelineEvent;
  isLast?: boolean;
  index: number;
}

export function TimelineEventCard({
  event,
  isLast = false,
  index,
}: TimelineEventCardProps) {
  const cfg = EVENT_CONFIG[event.type];
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, index]);

  const CardContent = (
    <View style={styles.cardInner}>
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.iconBg}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.accent }]}>
          <cfg.Icon size={18} color={cfg.color} strokeWidth={2.5} />
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={[styles.typeLabel, { color: cfg.color }]}>
          {cfg.label}
        </Text>
        <Text style={styles.date}>{event.date}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.desc}>{event.description}</Text>
        {event.type === "skill_progress" &&
          event.valueBefore != null &&
          event.valueAfter != null && (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[colors.success, colors.accent]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        100,
                        (event.valueAfter / 99) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {event.valueBefore} → {event.valueAfter}
              </Text>
            </View>
          )}
        {event.type === "video" && event.videoThumbnail && (
          <View style={styles.videoPreview}>
            <ImageBackground
              source={{ uri: event.videoThumbnail }}
              style={styles.videoImage}
              imageStyle={styles.videoImageStyle}
            >
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.6)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.playBtn}>
                <Video size={24} color="#fff" strokeWidth={2.5} />
              </View>
            </ImageBackground>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.wrap,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.lineWrap}>
        <View
          style={[
            styles.dot,
            { backgroundColor: cfg.color },
            event.type === "achievement" && styles.dotGlowGold,
            event.type === "coach_note" && styles.dotGlowBlue,
            event.type === "skill_progress" && styles.dotGlowGreen,
          ]}
        />
        <View style={[styles.dotGlow, { backgroundColor: cfg.color }]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.cardWrap}>
        {Platform.OS === "web" ? (
          <View style={[styles.card, styles.cardWeb]}>{CardContent}</View>
        ) : (
          <BlurView intensity={26} tint="dark" style={styles.card}>
            {CardContent}
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
  dotGlow: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.22,
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
    padding: 16,
    paddingLeft: 0,
  },
  accentBar: {
    width: 3,
    marginRight: 14,
    borderRadius: 2,
    alignSelf: "stretch",
  },
  iconBg: {
    marginRight: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  date: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.05,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.15,
  },
  desc: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.05,
  },
  progressRow: {
    marginTop: 12,
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "800",
  },
  videoPreview: {
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    height: 100,
  },
  videoImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoImageStyle: {
    borderRadius: 14,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
});

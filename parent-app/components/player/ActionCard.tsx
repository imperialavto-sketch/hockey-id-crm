import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { colors, spacing, radius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
};

export function ActionCard({ icon, title, subtitle, onPress }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => scale.value = withSpring(0.96)}
      onPressOut={() => scale.value = withSpring(1)}
      style={[styles.outer, animatedStyle]}
    >
      <View style={styles.card}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.1)",
            "rgba(255,255,255,0.03)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.glass]}
        />
        <View style={styles.topAccent} />
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={["rgba(37, 99, 235, 0.4)", "rgba(37, 99, 235, 0.15)"]}
              style={StyleSheet.absoluteFill}
            />
            {icon}
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    minHeight: 88,
  },
  glass: {
    borderRadius: radius.lg - 1,
  },
  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "transparent",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.3)",
  },
  textBlock: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: 4,
  },
});

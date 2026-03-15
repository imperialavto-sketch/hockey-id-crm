import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Home,
  User,
  ShoppingBag,
  MessageCircle,
  Settings,
} from "lucide-react-native";
import { colors, spacing, radius } from "@/constants/theme";

type TabId = "home" | "player" | "marketplace" | "messages" | "profile";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Главная", icon: Home },
  { id: "player", label: "Игрок", icon: User },
  { id: "marketplace", label: "Тренеры", icon: ShoppingBag },
  { id: "messages", label: "Чат", icon: MessageCircle },
  { id: "profile", label: "Профиль", icon: Settings },
];

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingTabBar({ activeTab, onTabChange }: Props) {
  return (
    <View style={[styles.container, styles.shadow]}>
      <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(11, 18, 32, 0.95)", "rgba(2, 6, 23, 0.98)"]}
        style={[StyleSheet.absoluteFill, styles.gradient]}
      />
      <View style={styles.topLine} />
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => onTabChange(tab.id)}
          />
        ))}
      </View>
    </View>
  );
}

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: (typeof tabs)[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const Icon = tab.icon;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => scale.value = withSpring(0.9)}
      onPressOut={() => scale.value = withSpring(1)}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      style={[styles.tab, animatedStyle]}
    >
      <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
        {isActive && (
          <LinearGradient
            colors={["rgba(37, 99, 235, 0.4)", "rgba(37, 99, 235, 0.15)"]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Icon
          size={22}
          color={isActive ? "#7dd3fc" : colors.textSecondary}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </View>
      <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
        {tab.label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    minHeight: 68,
  },
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
    },
    android: { elevation: 14 },
    default: {},
  }),
  gradient: {
    borderRadius: radius.xl - 1,
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 68,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconWrapActive: {
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  labelActive: {
    color: "#7dd3fc",
  },
});

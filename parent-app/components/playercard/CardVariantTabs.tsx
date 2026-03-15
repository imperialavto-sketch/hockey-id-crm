import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import type { DynamicCardVariant } from "@/constants/mockDynamicCard";
import { colors } from "@/constants/theme";

const TAB_GRADIENTS: Record<
  DynamicCardVariant,
  readonly [string, string, string]
> = {
  season: [
    "rgba(37,99,235,0.6)",
    "rgba(59,130,246,0.45)",
    "rgba(239,68,68,0.35)",
  ],
  elite: [
    "rgba(139,92,246,0.6)",
    "rgba(167,139,250,0.5)",
    "rgba(236,72,153,0.35)",
  ],
  tournament: [
    "rgba(251,191,36,0.55)",
    "rgba(253,224,71,0.4)",
    "rgba(239,68,68,0.35)",
  ],
  future_star: [
    colors.accent,
    "rgba(34,211,238,0.5)",
    "rgba(139,92,246,0.4)",
  ],
};

interface CardVariantTabsProps {
  active: DynamicCardVariant;
  onSelect: (v: DynamicCardVariant) => void;
  variants: { id: DynamicCardVariant; label: string }[];
}

function TabItem({
  label,
  isActive,
  variant,
  onPress,
}: {
  label: string;
  isActive: boolean;
  variant: DynamicCardVariant;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const gradient = TAB_GRADIENTS[variant];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      {isActive ? (
        <Animated.View style={[styles.activeWrapper, animatedStyle]}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeBg}
          >
            <Text style={styles.tabLabelActive}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      ) : (
        <Text style={styles.tabLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

export function CardVariantTabs({
  active,
  onSelect,
  variants,
}: CardVariantTabsProps) {
  const content = (
    <View style={styles.tabs}>
      {variants.map((v) => (
        <TabItem
          key={v.id}
          label={v.label}
          variant={v.id}
          isActive={active === v.id}
          onPress={() => onSelect(v.id)}
        />
      ))}
    </View>
  );

  if (Platform.OS === "web") {
    return <View style={[styles.wrap, styles.wrapWeb]}>{content}</View>;
  }
  return (
    <View style={styles.wrap}>
      <BlurView intensity={36} tint="dark" style={styles.blur}>
        {content}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  wrapWeb: {
    backgroundColor: "rgba(8,16,28,0.94)",
  },
  blur: {
    borderRadius: 28,
    overflow: "hidden",
  },
  tabs: {
    flexDirection: "row",
    padding: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPressed: {
    opacity: 0.9,
  },
  activeWrapper: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 6,
    bottom: 6,
    borderRadius: 18,
    overflow: "hidden",
  },
  activeBg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
  },
  tabLabel: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

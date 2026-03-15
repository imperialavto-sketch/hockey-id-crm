import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ActionLinkVariant = "default" | "accent" | "success";

const VARIANT_STYLES: Record<ActionLinkVariant, object> = {
  default: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  success: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.25)",
  },
};

export interface ActionLinkCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  variant?: ActionLinkVariant;
}

export function ActionLinkCard({
  icon,
  title,
  description,
  onPress,
  variant = "default",
}: ActionLinkCardProps) {
  const iconWrapStyle =
    variant === "success"
      ? styles.iconWrapSuccess
      : variant === "accent"
        ? styles.iconWrapAccent
        : styles.iconWrapDefault;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.card, VARIANT_STYLES[variant], animatedStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <View style={[styles.iconWrap, iconWrapStyle]}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconWrapDefault: {
    backgroundColor: colors.accentSoft,
  },
  iconWrapAccent: {
    backgroundColor: colors.accentSoft,
  },
  iconWrapSuccess: {
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  description: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
});

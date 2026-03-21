import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants/theme";

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

export const ActionLinkCard = memo(function ActionLinkCard({
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
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
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
  textWrap: { flex: 1, minWidth: 0 },
  title: {
    ...typography.cardTitle,
    fontSize: 16,
    color: colors.text,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

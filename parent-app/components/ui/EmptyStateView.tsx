import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, feedback } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

export interface EmptyStateViewProps {
  /** Title (e.g. "Пока пусто", "Нет видео"). */
  title: string;
  /** Subtitle / short description. */
  subtitle: string;
  /** Optional icon — ReactNode or Ionicons name. If not set, uses "document-text-outline". */
  icon?: React.ReactNode | keyof typeof Ionicons.glyphMap;
  /** CTA button label (e.g. "Загрузить видео", "Открыть команду"). */
  buttonLabel?: string;
  /** CTA press. Haptic is triggered automatically before onButtonPress. */
  onButtonPress?: () => void;
  /** Container style. */
  style?: ViewStyle;
  /** Accessibility label for button. */
  buttonAccessibilityLabel?: string;
}

/**
 * Unified empty state for lists and sections.
 * Softer than ErrorStateView; same visual language (icon circle, title, subtitle, optional CTA).
 * Haptic is called inside before onButtonPress.
 */
export function EmptyStateView({
  title,
  subtitle,
  icon,
  buttonLabel,
  onButtonPress,
  style,
  buttonAccessibilityLabel,
}: EmptyStateViewProps) {
  const handlePress = () => {
    triggerHaptic();
    onButtonPress?.();
  };

  const iconContent =
    icon === undefined ? (
      <Ionicons name="document-text-outline" size={28} color={colors.textMuted} />
    ) : typeof icon === "string" ? (
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={28} color={colors.textMuted} />
    ) : (
      icon
    );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>{iconContent}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonLabel != null && onButtonPress != null && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: feedback.pressedOpacity }]}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={buttonAccessibilityLabel ?? buttonLabel}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.onAccent,
  },
});

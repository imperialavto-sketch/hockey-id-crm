import React from "react";
import { View, Text, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

const PRESSED_OPACITY = 0.88;

const VARIANT_DEFAULTS = {
  network: {
    icon: "cloud-offline-outline" as const,
    title: "Ошибка загрузки",
    subtitle: "Проверьте соединение и попробуйте снова",
    actionLabel: "Повторить",
  },
  generic: {
    icon: "warning-outline" as const,
    title: "Что-то пошло не так",
    subtitle: "Попробуйте ещё раз или вернитесь позже",
    actionLabel: "Повторить",
  },
  notFound: {
    icon: "person-outline" as const,
    title: "Не найдено",
    subtitle: "Проверьте ссылку или выберите другой раздел",
    actionLabel: "Повторить",
  },
} as const;

export type ErrorStateVariant = keyof typeof VARIANT_DEFAULTS;

export interface ErrorStateViewProps {
  /** Predefined variant: network, generic, notFound. Defaults set icon, title, subtitle, actionLabel. */
  variant?: ErrorStateVariant;
  /** Override title (otherwise from variant). */
  title?: string;
  /** Override subtitle (otherwise from variant). */
  subtitle?: string;
  /** Primary button label. Default from variant (e.g. "Повторить"). */
  actionLabel?: string;
  /** Primary action (Retry etc.). Haptic is triggered automatically before onAction. */
  onAction?: () => void;
  /** Optional secondary button (e.g. "Назад"). */
  secondaryActionLabel?: string;
  /** Secondary action. Haptic triggered before onSecondaryAction. */
  onSecondaryAction?: () => void;
  /** Custom icon name (overrides variant icon). */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Container style. */
  style?: ViewStyle;
  /** Accessibility label for primary button. */
  actionAccessibilityLabel?: string;
}

/**
 * Unified error state for flagship screens.
 * Use variant for quick network/generic/notFound, or pass title/subtitle/actionLabel for full control.
 * Primary button: triggerHaptic is called inside before onAction — no need to add haptic in caller.
 */
export function ErrorStateView({
  variant = "network",
  title: titleProp,
  subtitle: subtitleProp,
  actionLabel: actionLabelProp,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon: iconProp,
  style,
  actionAccessibilityLabel,
}: ErrorStateViewProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const title = titleProp ?? defaults.title;
  const subtitle = subtitleProp ?? defaults.subtitle;
  const actionLabel = actionLabelProp ?? defaults.actionLabel;
  const iconName = iconProp ?? defaults.icon;

  const handlePrimary = () => {
    triggerHaptic();
    onAction?.();
  };

  const handleSecondary = () => {
    triggerHaptic();
    onSecondaryAction?.();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {onAction != null && (
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={handlePrimary}
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
        >
          <Text style={styles.primaryBtnText}>{actionLabel}</Text>
        </Pressable>
      )}
      {secondaryActionLabel != null && onSecondaryAction != null && (
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={handleSecondary}
          accessibilityRole="button"
          accessibilityLabel={secondaryActionLabel}
        >
          <Text style={styles.secondaryBtnText}>{secondaryActionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
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
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryBtnText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});

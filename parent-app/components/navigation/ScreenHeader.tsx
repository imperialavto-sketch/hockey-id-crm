import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, screenHeader, typography, feedback } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

export interface ScreenHeaderProps {
  title: string;
  /** Optional subtitle, shown below title in muted style */
  subtitle?: string;
  /** Back button handler. If not provided, back button is hidden. */
  onBack?: () => void;
  /** Right-side action (e.g. share, settings). Renders in 44x44 touch area. */
  rightAction?: React.ReactNode;
  /** Show subtle bottom border. Default: true */
  showBorder?: boolean;
}

/**
 * Unified premium screen header: back | title (+ subtitle) | right action.
 * Uses safe area insets, consistent spacing, and theme tokens.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  showBorder = true,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + screenHeader.paddingTop;

  const handleBack = () => {
    triggerHaptic();
    onBack?.();
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop },
        showBorder && styles.withBorder,
      ]}
    >
      <View style={styles.slot}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: feedback.pressedOpacity }]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
          >
            <Ionicons name="arrow-back" size={screenHeader.iconSize} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.btn} />
        )}
      </View>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.slot}>
        {rightAction ? (
          <View style={styles.rightWrap}>{rightAction}</View>
        ) : (
          <View style={styles.btn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: screenHeader.paddingBottom,
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: screenHeader.borderColor,
  },
  slot: {
    width: screenHeader.buttonSize,
    height: screenHeader.buttonSize,
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: screenHeader.buttonSize,
    height: screenHeader.buttonSize,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    marginHorizontal: spacing.sm,
    justifyContent: "center",
    minWidth: 0,
  },
  title: {
    fontSize: screenHeader.titleSize,
    fontWeight: screenHeader.titleWeight,
    lineHeight: 22,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightWrap: {
    width: screenHeader.buttonSize,
    height: screenHeader.buttonSize,
    alignItems: "center",
    justifyContent: "center",
  },
});

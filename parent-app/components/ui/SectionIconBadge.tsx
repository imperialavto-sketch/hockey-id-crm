import React, { memo, type ReactNode } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, glassSectionIconBadge } from "@/constants/theme";

export type SectionIconBadgeSize = "sm" | "md" | "lg" | "xl";
export type SectionIconBadgeVariant = "default" | "accent" | "success";

const DIM: Record<
  SectionIconBadgeSize,
  { box: number; radius: number; icon: number }
> = {
  sm: { box: 44, radius: 20, icon: 22 },
  md: { box: 48, radius: 22, icon: 24 },
  lg: { box: 56, radius: 24, icon: 28 },
  xl: { box: 80, radius: 26, icon: 40 },
};

export type SectionIconBadgeProps = {
  /** Ionicons glyph; не нужен, если передан `children`. */
  name?: keyof typeof Ionicons.glyphMap;
  /** Кастомная иконка (например Lucide) — белый/светлый глиф снаружи. */
  children?: ReactNode;
  size?: SectionIconBadgeSize;
  variant?: SectionIconBadgeVariant;
  /** Переопределить размер глифа для Ionicons (редко). */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  /** Красная точка (например непрочитанные в списке действий). */
  badgeDot?: boolean;
  allowFontScaling?: boolean;
};

function palette(variant: SectionIconBadgeVariant) {
  if (variant === "success") return glassSectionIconBadge.success;
  if (variant === "accent") return glassSectionIconBadge.accent;
  return glassSectionIconBadge.default;
}

function shadowFor(variant: SectionIconBadgeVariant) {
  return variant === "success"
    ? glassSectionIconBadge.shadowSuccess
    : glassSectionIconBadge.shadow;
}

/**
 * Единый glass-контейнер для пиктограмм: синий (или success) фон, светлая рамка, мягкое свечение, белый глиф.
 */
export const SectionIconBadge = memo(function SectionIconBadge({
  name,
  children,
  size = "md",
  variant = "default",
  iconSize: iconSizeProp,
  style,
  badgeDot = false,
  allowFontScaling = false,
}: SectionIconBadgeProps) {
  const dim = DIM[size];
  const pal = palette(variant);
  const sh = shadowFor(variant);
  const iconSize = iconSizeProp ?? dim.icon;
  const glyph =
    variant === "success" ? "#FFFFFF" : glassSectionIconBadge.glyph;

  const inner =
    children ??
    (name != null ? (
      <Ionicons
        name={name}
        size={iconSize}
        color={glyph}
        allowFontScaling={allowFontScaling}
      />
    ) : null);

  return (
    <View
      style={[
        styles.base,
        {
          width: dim.box,
          height: dim.box,
          borderRadius: dim.radius,
          ...pal,
          ...sh,
        },
        style,
      ]}
    >
      {inner}
      {badgeDot ? <View style={styles.badgeDot} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: "rgba(12, 22, 40, 0.95)",
  },
});

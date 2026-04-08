import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { iceEdgeGlow, textOnGlass } from "@/constants/theme";

const EM_DASH = "\u2014";

export const PREMIUM_JERSEY_MIN = 1;
export const PREMIUM_JERSEY_MAX = 99;

export type PremiumJerseyNumberProps = {
  value?: number | null;
  /** Базовый размер кегля (высота визуального блока номера), по умолчанию ~крупный broadcast */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Общая прозрачность контейнера */
  opacity?: number;
};

function normalizeDisplay(value: number | null | undefined): {
  label: string;
  isDash: boolean;
} {
  if (value == null || !Number.isFinite(value)) {
    return { label: `#${EM_DASH}`, isDash: true };
  }
  const t = Math.trunc(value);
  if (t < PREMIUM_JERSEY_MIN || t > PREMIUM_JERSEY_MAX) {
    return { label: `#${EM_DASH}`, isDash: true };
  }
  return { label: `#${t}`, isDash: false };
}

/**
 * Крупный NHL / broadcast-номер: два слоя текста (подсветка + fill), без картинок.
 * Валидны только целые 1–99; иначе показывается #— (EM DASH).
 */
export const PremiumJerseyNumber = memo(function PremiumJerseyNumber({
  value,
  size = 92,
  style,
  opacity = 1,
}: PremiumJerseyNumberProps) {
  const { label, isDash } = normalizeDisplay(value);
  const lineHeight = Math.round(size * 1.04);
  const letterSpacing = isDash ? size * -0.02 : label.length <= 2 ? size * -0.035 : size * -0.048;

  const textSizing = {
    fontSize: size,
    lineHeight,
    letterSpacing,
  };

  const tabular: TextStyle | undefined =
    Platform.OS === "ios" ? { fontVariant: ["tabular-nums"] } : undefined;

  const core: TextStyle = {
    ...textSizing,
    fontWeight: "900",
    textAlign: "left",
    ...tabular,
  };

  return (
    <View
      style={[styles.wrap, { opacity, minWidth: size * 2.28, minHeight: lineHeight * 1.08 }, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.stack}>
        {/* Нижний слой: мягкий «ледяной» bloom (не неон) */}
        <Text
          style={[styles.layerGlow, core, isDash && styles.layerGlowPlaceholder]}
          allowFontScaling={false}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
        {/* Верхний слой: читаемый полупрозрачный fill */}
        <Text
          style={[styles.layerFill, core, isDash && styles.layerFillDash]}
          allowFontScaling={false}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
  },
  stack: {
    position: "relative",
    justifyContent: "flex-end",
  },
  layerGlow: {
    position: "absolute",
    left: 0,
    top: Platform.OS === "ios" ? 1 : 0,
    color: "rgba(56, 189, 248, 0.12)",
    textShadowColor: iceEdgeGlow.default.shadowColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  layerFill: {
    color: "rgba(232, 244, 255, 0.36)",
  },
  /** Плейсхолдер #— чуть тише, чем цифры, но в той же иерархии текста на стекле */
  layerFillDash: {
    color: textOnGlass.secondary,
    opacity: 0.42,
  },
  layerGlowPlaceholder: {
    opacity: 0.55,
    textShadowRadius: 14,
  },
});

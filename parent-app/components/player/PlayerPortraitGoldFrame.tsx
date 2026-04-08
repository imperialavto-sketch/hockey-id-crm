import React, { memo } from "react";
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/** Толщина «металлической» каймы (px), в диапазоне 2–3. */
export const PLAYER_PORTRAIT_GOLD_BORDER_PX = 2.5;

/**
 * Градиент золота без «кислотного» тона — единый премиальный ободок портрета.
 * См. также #F6E27A, #D4AF37, #B8962E в массиве ниже.
 */
export const PLAYER_PORTRAIT_GOLD_GRADIENT = [
  "#F6E27A",
  "#E8C85A",
  "#D4AF37",
  "#C4A028",
  "#B8962E",
  "#C9A83A",
] as const;

export interface PlayerPortraitGoldFrameProps {
  width: number;
  height: number;
  borderRadius: number;
  children: React.ReactNode;
  /** Очень слабое внешнее свечение (не неон). По умолчанию true. */
  softGlow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Премиальная золотая рамка вокруг портрета (скруглённый прямоугольник, не круг).
 * Размер внешнего блока = width×height; фото заполняет внутреннюю область с инсетом под кайму.
 */
export const PlayerPortraitGoldFrame = memo(function PlayerPortraitGoldFrame({
  width,
  height,
  borderRadius,
  children,
  softGlow = true,
  style,
}: PlayerPortraitGoldFrameProps) {
  const b = PLAYER_PORTRAIT_GOLD_BORDER_PX;
  const innerR = Math.max(0, borderRadius - b);

  return (
    <View style={[softGlow && styles.softGlow, { width, height, borderRadius }, style]}>
      <LinearGradient
        colors={[...PLAYER_PORTRAIT_GOLD_GRADIENT]}
        start={{ x: 0.12, y: 0.08 }}
        end={{ x: 0.88, y: 0.95 }}
        style={{
          width,
          height,
          borderRadius,
          padding: b,
        }}
      >
        <View style={[styles.innerClip, { borderRadius: innerR }]}>{children}</View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  softGlow: {
    ...Platform.select({
      ios: {
        shadowColor: "#6B5A24",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  innerClip: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
});

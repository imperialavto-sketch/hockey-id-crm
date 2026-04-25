import React, { memo } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { glassVisual, iceEdgeGlow } from "@/constants/theme";

export type GlassSurfaceVariant = "large" | "small";

export interface GlassSurfaceProps {
  variant?: GlassSurfaceVariant;
  /** Лёгкий тёмный тинт под плотный текст (≤0.10). */
  textComfortTint?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Ice glass: внешний wrapper со свечением (без overflow:hidden) + внутренняя surface с градиентами.
 * Иначе iOS обрезает shadow и glow не читается.
 */
export const GlassSurface = memo(function GlassSurface({
  variant = "large",
  textComfortTint = false,
  style,
  children,
}: GlassSurfaceProps) {
  const inner = variant === "large" ? glassVisual.shellLarge : glassVisual.shellSmall;
  const br = inner.borderRadius as number;
  const outerGlow = variant === "large" ? iceEdgeGlow.default : iceEdgeGlow.subtle;
  const ringColor = variant === "large" ? glassVisual.edgeRingDefault : glassVisual.edgeRingSubtle;

  const haloStyle = {
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: br + 2,
    backgroundColor: glassVisual.outerHaloFill,
  };

  return (
    <View style={[{ borderRadius: br, backgroundColor: "transparent" }, outerGlow, style]}>
      <View style={[styles.haloLayer, haloStyle]} pointerEvents="none" />
      <View style={inner}>
        <LinearGradient
          colors={glassVisual.iceFaceGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", glassVisual.iceBottomGlow]}
          locations={[0.62, 1] as const}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        {variant === "large" ? (
          <LinearGradient
            colors={glassVisual.iceCornerGlowColors}
            locations={glassVisual.iceCornerGlowLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        ) : null}
        {textComfortTint ? (
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: glassVisual.textComfortTint }]}
            pointerEvents="none"
          />
        ) : null}
        <View
          style={[
            styles.edgeRing,
            {
              borderRadius: br,
              borderColor: ringColor,
            },
          ]}
          pointerEvents="none"
        />
        <View
          style={[styles.topEdge, { backgroundColor: glassVisual.topEdgeHighlight }]}
          pointerEvents="none"
        />
        <View style={styles.foreground}>{children}</View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  haloLayer: {
    position: "absolute",
    zIndex: 0,
  },
  edgeRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    zIndex: 1,
  },
  topEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  foreground: {
    position: "relative",
    zIndex: 3,
  },
});

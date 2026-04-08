import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

const ARENA_BG = require("@/assets/images/coach-arena-background.png");

/**
 * Full-screen premium arena photography + very light readability veil.
 * Renders behind the app shell; pointerEvents none — does not capture touches.
 */
export function ProIceBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={ARENA_BG}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Subtle dark navy tint only — keeps ice/coach readable, no gray fog */}
        <View style={styles.readabilityVeil} pointerEvents="none" />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  readabilityVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 10, 22, 0.22)",
  },
});

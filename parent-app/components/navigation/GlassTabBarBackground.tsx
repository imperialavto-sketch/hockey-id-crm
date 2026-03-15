import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

export function GlassTabBarBackground() {
  if (Platform.OS === "web") {
    return <View style={[StyleSheet.absoluteFill, styles.webFallback]} />;
  }
  return (
    <View style={styles.wrapper}>
      <BlurView
        intensity={28}
        tint="dark"
        style={[StyleSheet.absoluteFill, styles.blur]}
      />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  blur: {
    overflow: "hidden",
    borderRadius: 999,
  },
  overlay: {
    backgroundColor: "rgba(2,6,18,0.35)",
    borderRadius: 999,
  },
  webFallback: {
    backgroundColor: "rgba(2,6,18,0.85)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
});

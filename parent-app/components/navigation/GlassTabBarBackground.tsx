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
        intensity={32}
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
    borderColor: "rgba(255,255,255,0.06)",
  },
  blur: {
    overflow: "hidden",
    borderRadius: 999,
  },
  overlay: {
    backgroundColor: "rgba(2,6,18,0.4)",
    borderRadius: 999,
  },
  webFallback: {
    backgroundColor: "rgba(2,6,18,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
});

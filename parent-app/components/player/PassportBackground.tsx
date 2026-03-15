import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Passport screen background — flat, official, minimal.
 * No animation. Document/identity screen feel.
 */
export function PassportBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={["#030a14", "#05121e", "#071426", "#030a12"]}
        locations={[0, 0.4, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});

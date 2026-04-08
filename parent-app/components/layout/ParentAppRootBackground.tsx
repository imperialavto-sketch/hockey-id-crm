import React from "react";
import { ImageBackground, StyleSheet } from "react-native";

/**
 * Единый full-screen фон родительского приложения (все табы и stack).
 * Без оверлеев поверх изображения — фото без затемнения и градиентных «плёнок».
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PARENT_GLOBAL_BG = require("@/assets/backgrounds/parent-app-global-bg.png");

export function ParentAppRootBackground({ children }: { children: React.ReactNode }) {
  return (
    <ImageBackground source={PARENT_GLOBAL_BG} style={styles.bgRoot} resizeMode="cover">
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgRoot: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

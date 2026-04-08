import React, { memo, useMemo } from "react";
import { View, StyleSheet, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused?: boolean;
  /** Точка «есть что посмотреть» — без смешения с другими разделами. */
  showAttentionDot?: boolean;
};

/**
 * Активный таб: только свечение глифа (textShadow) — без круга, без подложки, без shadow на View.
 */
export const TabBarIconWithAttention = memo(function TabBarIconWithAttention({
  name,
  color,
  focused = false,
  showAttentionDot = false,
}: Props) {
  const iconStyle = useMemo((): TextStyle | undefined => {
    if (!focused) return undefined;
    // Узкий ореол вокруг контура шрифта (меньший radius — не выглядит как круглое пятно).
    return {
      textShadowColor: "rgba(210, 245, 255, 0.9)",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
    };
  }, [focused]);

  return (
    <View style={styles.wrap}>
      <Ionicons name={name} size={23} color={color} style={iconStyle} />
      {showAttentionDot ? <View style={styles.dot} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "transparent",
  },
  dot: {
    position: "absolute",
    top: -1,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: "rgba(15,23,42,0.96)",
  },
});

import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { uiColors, uiHero, uiTypography } from "@/constants/ui";

interface HeroLayoutProps {
  title: string;
  subtitle: string;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function HeroLayout({ title, subtitle, rightAction, style }: HeroLayoutProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {rightAction ? <View style={styles.action}>{rightAction}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: uiHero.blockBottomGap,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    marginLeft: 12,
  },
  title: {
    ...uiTypography.title,
    color: uiColors.textPrimary,
    marginBottom: uiHero.titleSubtitleGap,
  },
  subtitle: {
    ...uiTypography.subtitle,
    color: uiColors.textSecondary,
    lineHeight: 20,
    textShadowColor: "rgba(8,16,36,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

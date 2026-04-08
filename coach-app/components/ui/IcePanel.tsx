import React from "react";
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/constants/theme";

export type IcePanelVariant = "default" | "highlight" | "success";
export type IcePanelPadding = "none" | "sm" | "md" | "lg";

export type IcePanelProps = {
  children: React.ReactNode;
  variant?: IcePanelVariant;
  padding?: IcePanelPadding;
  /** Active / listening only — restrained primary halo, not default for every panel */
  glow?: boolean;
  blurIntensity?: number;
  /** Ambient rink texture only — extremely faint */
  tacticalHints?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

const PADDING_MAP: Record<IcePanelPadding, number> = {
  none: 0,
  sm: theme.spacing.sm,
  md: theme.spacing.md,
  lg: theme.spacing.lg,
};

/** Thinner, colder rim — no bright “neon” blue */
const VARIANT: Record<IcePanelVariant, { border: string; rim: string }> = {
  default: {
    border: "rgba(95, 130, 168, 0.14)",
    rim: "rgba(65, 100, 140, 0.045)",
  },
  highlight: {
    border: "rgba(100, 140, 180, 0.18)",
    rim: "rgba(72, 112, 152, 0.055)",
  },
  success: {
    border: "rgba(98, 138, 178, 0.16)",
    rim: "rgba(70, 108, 148, 0.05)",
  },
};

const SHELL_SHADOW = {
  base: {
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  glow: {
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
} as const;

function TacticalHintsLayer() {
  return (
    <View style={styles.tacticalLayer} pointerEvents="none">
      <View style={styles.tacticalH} />
      <View style={styles.tacticalV} />
      <View style={[styles.tacticalDot, styles.tacticalDotTL]} />
      <View style={[styles.tacticalDot, styles.tacticalDotTR]} />
      <View style={[styles.tacticalDot, styles.tacticalDotBL]} />
      <View style={[styles.tacticalDot, styles.tacticalDotBR]} />
    </View>
  );
}

/**
 * Coach Ice HUD — calm glass: low-contrast inner light, thin cold rim, soft depth.
 */
export function IcePanel({
  children,
  variant = "default",
  padding = "md",
  glow = false,
  blurIntensity = 20,
  tacticalHints = false,
  style,
  contentStyle,
}: IcePanelProps) {
  const v = VARIANT[variant];
  const pad = PADDING_MAP[padding];
  const shellShadow = glow ? SHELL_SHADOW.glow : SHELL_SHADOW.base;

  const inner = (
    <>
      {Platform.OS === "web" ? null : (
        <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(130, 175, 210, 0.035)",
          "rgba(40, 68, 98, 0.03)",
          "rgba(6, 14, 26, 0.52)",
        ]}
        locations={[0, 0.4, 1]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.03)", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]}
        locations={[0, 0.32, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[v.rim, "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {tacticalHints ? <TacticalHintsLayer /> : null}
      <View style={styles.iceHairline} pointerEvents="none" />
      <View style={[styles.body, { padding: pad }, contentStyle]}>{children}</View>
    </>
  );

  return (
    <View style={[styles.outer, shellShadow, style]}>
      <View
        style={[
          styles.rimWrap,
          glow && styles.rimWrapGlow,
          {
            borderColor: v.border,
          },
        ]}
      >
        <View style={[styles.container, { borderColor: v.border }]}>{inner}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: theme.borderRadius.lg + 1,
    backgroundColor: "transparent",
    marginBottom: theme.layout.sectionGap,
  },
  rimWrap: {
    borderRadius: theme.borderRadius.lg + 1,
    padding: StyleSheet.hairlineWidth,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  rimWrapGlow: {
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  container: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    backgroundColor: "rgba(5, 12, 22, 0.5)",
  },
  iceHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(170, 200, 230, 0.07)",
    zIndex: 2,
  },
  body: {
    zIndex: 3,
  },
  tacticalLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    opacity: 0.22,
  },
  tacticalH: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: "51%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(160, 195, 230, 0.35)",
  },
  tacticalV: {
    position: "absolute",
    left: "50%",
    top: "14%",
    bottom: "14%",
    width: 1,
    marginLeft: -0.5,
    backgroundColor: "rgba(160, 195, 230, 0.25)",
  },
  tacticalDot: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(190, 220, 250, 0.4)",
  },
  tacticalDotTL: { left: "12%", top: "16%" },
  tacticalDotTR: { right: "12%", top: "16%" },
  tacticalDotBL: { left: "12%", bottom: "16%" },
  tacticalDotBR: { right: "12%", bottom: "16%" },
});

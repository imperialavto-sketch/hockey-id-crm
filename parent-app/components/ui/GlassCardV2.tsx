import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { radius, spacing } from "@/constants/theme";
import { uiColors } from "@/constants/ui";
import {
  PULSE_CARD_LAG_MS,
  PULSE_HEARTBEAT_DECAY_AFTER_LAG_MS,
  PULSE_HEARTBEAT_PEAK_MS,
  pulseEasingDecay,
  pulseEasingPeak,
} from "@/lib/parentPulseRhythm";

export type GlassCardV2Variant = "default" | "highlight" | "success";
export type GlassCardV2Padding = "none" | "sm" | "md" | "lg";

interface GlassCardV2Props {
  children: React.ReactNode;
  variant?: GlassCardV2Variant;
  padding?: GlassCardV2Padding;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
  glow?: boolean;
  /**
   * Синхрон с ритмом DevelopmentPulseGraph (задержка ~125 ms), только для главных карточек.
   * Слабое дыхание glow / кромки / верхнего света — без отдельного «параллельного» цикла.
   */
  pulseBreath?: boolean;
  blurIntensity?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const PADDING_MAP: Record<GlassCardV2Padding, number> = {
  none: 0,
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
};

const VARIANT_STYLES: Record<GlassCardV2Variant, { borderColor: string; bg: string }> = {
  default: {
    borderColor: "rgba(255,255,255,0.06)",
    bg: uiColors.glassBg,
  },
  highlight: {
    borderColor: "rgba(255,255,255,0.08)",
    bg: uiColors.glassBgHighlight,
  },
  success: {
    borderColor: "rgba(255,255,255,0.065)",
    bg: uiColors.glassBgSuccess,
  },
};

const BORDER_BREATH: Record<GlassCardV2Variant, { base: number; amp: number }> = {
  default: { base: 0.06, amp: 0.02 },
  highlight: { base: 0.08, amp: 0.02 },
  success: { base: 0.065, amp: 0.015 },
};

const AnimatedView = Animated.View;

export function GlassCardV2({
  children,
  variant = "default",
  padding = "md",
  header,
  footer,
  badge,
  glow = false,
  pulseBreath = false,
  blurIntensity = 20,
  style,
  contentStyle,
}: GlassCardV2Props) {
  const variantStyle = VARIANT_STYLES[variant];
  const pulseHb = useSharedValue(0);

  useEffect(() => {
    if (!pulseBreath) {
      cancelAnimation(pulseHb);
      pulseHb.value = 0;
      return;
    }
    pulseHb.value = 0;
    pulseHb.value = withRepeat(
      withSequence(
        withTiming(0, { duration: PULSE_CARD_LAG_MS }),
        withTiming(1, {
          duration: PULSE_HEARTBEAT_PEAK_MS,
          easing: pulseEasingPeak,
        }),
        withTiming(0, {
          duration: PULSE_HEARTBEAT_DECAY_AFTER_LAG_MS,
          easing: pulseEasingDecay,
        })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulseHb);
  }, [pulseBreath, pulseHb]);

  const animatedOuterStyle = useAnimatedStyle(() => {
    const hb = pulseHb.value;
    if (Platform.OS === "ios") {
      const opTrough = glow ? 0.095 : 0.06;
      const rTrough = glow ? 25 : 22;
      const rDelta = glow ? 2 : 4;
      return {
        shadowColor: glow ? "#7EB0FF" : "#8EC8FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: opTrough + hb * 0.03,
        shadowRadius: rTrough + hb * rDelta,
      };
    }
    return {};
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    const hb = pulseHb.value;
    const { base, amp } = BORDER_BREATH[variant];
    return {
      borderColor: `rgba(255,255,255,${base + hb * amp})`,
    };
  });

  const topLightBreathStyle = useAnimatedStyle(() => ({
    opacity: 0.714 + pulseHb.value * 0.286,
  }));

  const outerPulseAndroid = glow ? styles.outerGlowAndroid : styles.outerDefaultAndroid;

  const inner = (
    <>
      {Platform.OS === "web" ? null : (
        <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      )}
      <View style={styles.depthWash} pointerEvents="none" />
      <View style={styles.depthWashFine} pointerEvents="none" />
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(220,245,255,0.10)",
          "rgba(140,190,255,0.045)",
          "rgba(12,20,40,0.06)",
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {pulseBreath ? (
        <AnimatedView
          style={[StyleSheet.absoluteFillObject, topLightBreathStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]}
            locations={[0, 0.38, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </AnimatedView>
      ) : (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]}
          locations={[0, 0.38, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <View style={styles.topHairline} pointerEvents="none" />
      {badge ? <View style={styles.badgeWrap}>{badge}</View> : null}
      {header ? <View style={[styles.header, { padding: PADDING_MAP[padding] }]}>{header}</View> : null}
      <View style={[styles.body, { padding: PADDING_MAP[padding] }, contentStyle]}>{children}</View>
      {footer ? <View style={[styles.footer, { padding: PADDING_MAP[padding] }]}>{footer}</View> : null}
    </>
  );

  const containerStatic = {
    borderColor: variantStyle.borderColor,
    backgroundColor: variantStyle.bg,
  };

  if (pulseBreath) {
    return (
      <AnimatedView
        style={[
          styles.outerPulseBase,
          Platform.OS === "android" ? outerPulseAndroid : undefined,
          animatedOuterStyle,
          style,
        ]}
      >
        <AnimatedView style={[styles.container, containerStatic, animatedContainerStyle]}>
          {inner}
        </AnimatedView>
      </AnimatedView>
    );
  }

  return (
    <View style={[styles.outer, glow && styles.outerGlow, style]}>
      <View style={[styles.container, containerStatic]}>{inner}</View>
    </View>
  );
}

const CARD_SHADOW = {
  default: {
    shadowColor: "#8EC8FF" as const,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
  glow: {
    shadowColor: "#7EB0FF" as const,
    shadowOpacity: 0.1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 11,
  },
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    ...Platform.select<ViewStyle>({
      ios: CARD_SHADOW.default,
      android: {
        elevation: CARD_SHADOW.default.elevation,
      },
      default: {},
    }),
  },
  outerGlow: Platform.select<ViewStyle>({
    ios: CARD_SHADOW.glow,
    android: { elevation: CARD_SHADOW.glow.elevation },
    default: {},
  }),
  outerPulseBase: {
    borderRadius: radius.lg,
    backgroundColor: "transparent",
  },
  outerDefaultAndroid: {
    elevation: CARD_SHADOW.default.elevation,
  },
  outerGlowAndroid: {
    elevation: CARD_SHADOW.glow.elevation,
  },
  container: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.35,
    overflow: "hidden",
  },
  depthWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  depthWashFine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.018)",
  },
  topHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  badgeWrap: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 3,
  },
  header: {
    zIndex: 2,
    paddingBottom: 0,
  },
  body: {
    zIndex: 2,
  },
  footer: {
    zIndex: 2,
    paddingTop: 0,
  },
});

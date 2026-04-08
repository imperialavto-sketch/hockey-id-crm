import React, { memo, useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, radius } from "@/constants/theme";
import {
  PULSE_HEARTBEAT_DECAY_MS,
  PULSE_HEARTBEAT_PEAK_MS,
} from "@/lib/parentPulseRhythm";

const GRAPH_H_DEFAULT = 58;
const GRAPH_H_ARENA_HERO = 52;
const PAD_X = 2;

export type DevelopmentPulseGraphVisualPreset = "default" | "arenaHero";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.View;

function waveY(v: number, tNorm: number, h: number): number {
  const mid = h * 0.52;
  const amp = h * 0.36;
  const bump = 1 + 0.07 * Math.sin(tNorm * Math.PI * 8);
  return mid - (v - 0.5) * 2 * amp * bump;
}

function buildPulsePath(samples: number[], w: number, h: number): string {
  const n = samples.length;
  if (n < 2 || w <= PAD_X * 2) return "";
  const innerW = Math.max(1, w - PAD_X * 2);
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = PAD_X + (i / (n - 1)) * innerW;
    const tNorm = i / (n - 1);
    const y = waveY(samples[i] ?? 0.5, tNorm, h);
    if (i === 0) d = `M ${x} ${y}`;
    else {
      const px = PAD_X + ((i - 1) / (n - 1)) * innerW;
      const ptNorm = (i - 1) / (n - 1);
      const py = waveY(samples[i - 1] ?? 0.5, ptNorm, h);
      const c1x = px + (x - px) * 0.38;
      const c1y = py;
      const c2x = px + (x - px) * 0.64;
      const c2y = y;
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`;
    }
  }
  return d;
}

function dotAt(samples: number[], dotT: number, w: number, h: number): { x: number; y: number } {
  const n = samples.length;
  if (n < 2 || w <= PAD_X * 2) return { x: w * 0.88, y: h * 0.52 };
  const innerW = Math.max(1, w - PAD_X * 2);
  const idx = dotT * (n - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, n - 1);
  const f = idx - i0;
  const v = (samples[i0] ?? 0.5) * (1 - f) + (samples[i1] ?? 0.5) * f;
  const x = PAD_X + dotT * innerW;
  const y = waveY(v, dotT, h);
  return { x, y };
}

/**
 * «Пульс развития» — ледяная кардиолиния с heartbeat по данным оценок.
 * Path `d` не анимируется; только opacity/r через Reanimated → стабильный FPS.
 */
export const DevelopmentPulseGraph = memo(function DevelopmentPulseGraph({
  samples,
  dotT,
  visualPreset = "default",
}: {
  samples: number[];
  dotT: number;
  /** Только внешний вид (высота, кадр, отступы) — расчёт пути и пульс тот же. */
  visualPreset?: DevelopmentPulseGraphVisualPreset;
}) {
  const graphH = visualPreset === "arenaHero" ? GRAPH_H_ARENA_HERO : GRAPH_H_DEFAULT;
  const isArenaHero = visualPreset === "arenaHero";
  const [w, setW] = useState(280);
  const drift = useSharedValue(0);
  /** 0..1: фаза одного «удара» пульса */
  const hb = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(-5.5, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    hb.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: PULSE_HEARTBEAT_PEAK_MS,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0, {
          duration: PULSE_HEARTBEAT_DECAY_MS,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(drift);
      cancelAnimation(hb);
    };
  }, [drift, hb]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.value }],
  }));

  const glowPathProps = useAnimatedProps(() => ({
    opacity: 0.26 + hb.value * 0.46,
  }));

  const corePathProps = useAnimatedProps(() => ({
    opacity: 0.84 + hb.value * 0.16,
  }));

  /** Расширяющийся мягкий ореол — главный визуальный «живой» акцент */
  const dotHaloProps = useAnimatedProps(() => ({
    r: 4.2 + hb.value * 7.5,
    opacity: 0.08 + hb.value * 0.34,
  }));

  /** Ядро точки слегка «дышит» */
  const dotCoreProps = useAnimatedProps(() => ({
    r: 2.25 + hb.value * 0.55,
    opacity: 0.88 + hb.value * 0.12,
  }));

  /** Тонкое кольцо вокруг ядра: импульсный всплеск без заливки */
  const dotRingProps = useAnimatedProps(() => ({
    r: 2.8 + hb.value * 5.2,
    opacity: hb.value * 0.55,
  }));

  const series = samples.length >= 2 ? samples : [0.5, 0.52, 0.5, 0.53];
  const pathD = useMemo(() => buildPulsePath(series, w, graphH), [series, w, graphH]);
  const dot = useMemo(() => dotAt(series, dotT, w, graphH), [series, dotT, w, graphH]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = Math.floor(e.nativeEvent.layout.width);
    if (next > 8) setW(next);
  }, []);

  const wrapStyle = [styles.wrap, isArenaHero && styles.wrapArenaHero];
  const captionStyle = [styles.caption, isArenaHero && styles.captionArenaHero];
  const frameStyle = [styles.frame, isArenaHero && styles.frameArenaHero];
  const glowW = isArenaHero ? 6.1 : 5.5;
  const coreW = isArenaHero ? 1.68 : 1.55;

  if (!pathD) {
    return (
      <View style={wrapStyle} onLayout={onLayout}>
        <Text style={captionStyle}>Пульс развития</Text>
        <View style={[...frameStyle, { height: graphH }]} />
      </View>
    );
  }

  return (
    <View style={wrapStyle} onLayout={onLayout}>
      <Text style={captionStyle}>Пульс развития</Text>
      <View style={[...frameStyle, { minHeight: graphH }]}>
        {isArenaHero ? (
          <>
            <LinearGradient
              pointerEvents="none"
              colors={[
                "rgba(72, 165, 245, 0.11)",
                "rgba(12, 40, 72, 0.45)",
                "rgba(2, 12, 28, 0.92)",
              ]}
              locations={[0, 0.42, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0)", "transparent"]}
              locations={[0, 0.35, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.85, y: 0.55 }}
              style={StyleSheet.absoluteFillObject}
            />
          </>
        ) : null}
        <AnimatedView style={[styles.anim, driftStyle, { minHeight: graphH }]}>
          <Svg width={w} height={graphH} pointerEvents="none">
            <AnimatedPath
              animatedProps={glowPathProps}
              d={pathD}
              stroke="rgba(56, 189, 248, 0.95)"
              strokeWidth={glowW}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Svg width={w} height={graphH} pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            <AnimatedPath
              animatedProps={corePathProps}
              d={pathD}
              stroke="rgb(207, 242, 255)"
              strokeWidth={coreW}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <AnimatedCircle
              animatedProps={dotHaloProps}
              cx={dot.x}
              cy={dot.y}
              fill="rgba(56, 189, 248, 1)"
            />
            <AnimatedCircle
              animatedProps={dotRingProps}
              cx={dot.x}
              cy={dot.y}
              fill="none"
              stroke="rgba(186, 230, 253, 0.9)"
              strokeWidth={1}
            />
            <AnimatedCircle
              animatedProps={dotCoreProps}
              cx={dot.x}
              cy={dot.y}
              fill="rgb(248, 252, 255)"
            />
          </Svg>
        </AnimatedView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  wrapArenaHero: {
    marginTop: spacing.xs,
  },
  caption: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "rgba(186, 218, 255, 0.55)",
    marginBottom: spacing.sm,
  },
  captionArenaHero: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.12,
    color: "rgba(210, 232, 255, 0.78)",
    marginBottom: 3,
  },
  frame: {
    borderRadius: radius.md,
    backgroundColor: "rgba(6, 22, 44, 0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(130, 180, 235, 0.14)",
    overflow: "hidden",
    minHeight: GRAPH_H_DEFAULT,
  },
  frameArenaHero: {
    borderRadius: radius.lg - 2,
    backgroundColor: "rgba(3, 14, 32, 0.92)",
    borderColor: "rgba(150, 205, 255, 0.16)",
    ...Platform.select({
      ios: {
        shadowColor: "#7dd3fc",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 0 },
      default: {},
    }),
  },
  anim: {
    minHeight: GRAPH_H_DEFAULT,
  },
});

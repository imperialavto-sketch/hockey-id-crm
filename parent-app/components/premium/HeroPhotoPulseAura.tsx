import React, { useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const outwardEase = Easing.out(Easing.cubic);

/** Невидимый компакт перед импульсом — нет «сборки кадром» к рамке */
const PAUSE_PRE_MS = 260;
/** Только расширение наружу + растворение (один проход) */
const OUTWARD_MS = 1100;
/** Держим разнесённое состояние уже невидимым — без обратной анимации */
const PAUSE_POST_MS = 980;

const CYCLE_MS = PAUSE_PRE_MS + OUTWARD_MS + PAUSE_POST_MS;
const PRE_END = PAUSE_PRE_MS / CYCLE_MS;
const EXP_END = (PAUSE_PRE_MS + OUTWARD_MS) / CYCLE_MS;

const SCALE_START = 0.98;
const SCALE_END = 1.14;
const OPACITY_START = 0.28;

const OUTER_PAD = 14;

type Props = {
  width: number;
  height: number;
  borderRadius: number;
};

/**
 * Однонаправленный outward pulse: невидимый старт → волна у рамки уходит наружу и гаснет → пауза →
 * мгновенный сброс, пока слой полностью прозрачен (нет collapse к фото).
 */
export function HeroPhotoPulseAura({ width, height, borderRadius }: Props) {
  const cycle = useSharedValue(0);
  const gradId = useMemo(
    () => `heroPhotoAura_${Math.random().toString(36).slice(2, 11)}`,
    []
  );

  const outerW = width + OUTER_PAD * 2;
  const outerH = height + OUTER_PAD * 2;
  const rx = Math.min(borderRadius + 6, outerW / 2 - 1, outerH / 2 - 1);

  useEffect(() => {
    cycle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(cycle);
  }, [cycle]);

  const outerStyle = useAnimatedStyle(() => {
    const t = cycle.value;
    if (t < PRE_END) {
      return {
        opacity: 0,
        transform: [{ scale: SCALE_START }],
      };
    }
    if (t < EXP_END) {
      const u = (t - PRE_END) / (EXP_END - PRE_END);
      const e = outwardEase(u);
      return {
        opacity: OPACITY_START * (1 - e),
        transform: [
          {
            scale: SCALE_START + (SCALE_END - SCALE_START) * e,
          },
        ],
      };
    }
    return {
      opacity: 0,
      transform: [{ scale: SCALE_END }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.auraWrap,
        { width: outerW, height: outerH, left: -OUTER_PAD, top: -OUTER_PAD },
        outerStyle,
      ]}
    >
      <Svg width={outerW} height={outerH}>
        <Defs>
          <RadialGradient
            id={gradId}
            cx="50%"
            cy="50%"
            rx="78%"
            ry="78%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor="rgb(120,200,255)" stopOpacity={0} />
            <Stop offset="62%" stopColor="rgb(120,200,255)" stopOpacity={0} />
            <Stop offset="74%" stopColor="rgb(120,200,255)" stopOpacity={0.28} />
            <Stop offset="92%" stopColor="rgb(120,200,255)" stopOpacity={0.1} />
            <Stop offset="100%" stopColor="rgb(120,200,255)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={outerW}
          height={outerH}
          rx={rx}
          ry={rx}
          fill={`url(#${gradId})`}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  auraWrap: {
    position: "absolute",
  },
});

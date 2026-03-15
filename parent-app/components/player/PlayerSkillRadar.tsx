import React, { useEffect } from "react";
import { colors } from "@/constants/theme";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Polygon, Line, G, Text as SvgText } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CHART_SIZE = Math.min(width - 80, 280);
const GRID_COLOR = "rgba(255,255,255,0.08)";
const LABEL_COLOR = "#94A3B8";

export interface SkillData {
  label: string;
  value: number;
}

interface PlayerSkillRadarProps {
  data: SkillData[];
  size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

export function PlayerSkillRadar({ data, size = CHART_SIZE }: PlayerSkillRadarProps) {
  const center = size / 2;
  const maxR = center - 44;
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, []);

  if (data.length < 3) return null;

  const angleStep = 360 / data.length;

  const points = data.map((d, i) => {
    const angle = -90 + i * angleStep;
    const r = (d.value / 99) * maxR;
    return polarToCartesian(center, center, Math.max(r, 4), angle);
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const axes = data.map((_, i) => {
    const angle = -90 + i * angleStep;
    const end = polarToCartesian(center, center, maxR, angle);
    return { angle, end };
  });

  const labelPositions = data.map((d, i) => {
    const angle = -90 + i * angleStep;
    const r = maxR + 22;
    return {
      ...polarToCartesian(center, center, r, angle),
      label: d.label,
    };
  });

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View style={styles.chartWrap}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G>
            {gridLevels.map((level, li) => (
              <Polygon
                key={li}
                points={axes
                  .map((a) =>
                    polarToCartesian(center, center, maxR * level, a.angle)
                  )
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="none"
                stroke={GRID_COLOR}
                strokeWidth={1}
              />
            ))}
            {axes.map((a, i) => (
              <Line
                key={i}
                x1={center}
                y1={center}
                x2={a.end.x}
                y2={a.end.y}
                stroke={GRID_COLOR}
                strokeWidth={1}
              />
            ))}
            <Polygon
              points={polygonPoints}
              fill={colors.accentSoft}
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {labelPositions.map((pos, i) => (
              <SvgText
                key={i}
                x={pos.x}
                y={pos.y}
                fill={LABEL_COLOR}
                fontSize={11}
                textAnchor="middle"
              >
                {pos.label}
              </SvgText>
            ))}
          </G>
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  chartWrap: {
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
});

import React, { memo } from "react";
import { View, Text, Image, StyleSheet, Platform, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PlayerPortraitGoldFrame } from "@/components/player/PlayerPortraitGoldFrame";

export interface PlayerAvatarProps {
  /** URL фото; пусто — показывается монограмма. */
  uri?: string | null;
  /** Ширина внешней рамки. */
  size: number;
  /** Высота; по умолчанию = size (квадрат). */
  height?: number;
  /**
   * `gold` — паспорт (золотая рамка).
   * `ice` — hero / ледяной UI: холодное стекло, без золота.
   */
  variant?: "gold" | "ice";
  /** Скругление внешнего блока (паспорт: 10; ice hero: 20). */
  borderRadius?: number;
  /** Текст при отсутствии фото. */
  fallbackLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Портрет игрока: золото для паспорта (`variant="gold"`), ice glass для hero (`variant="ice"`).
 */
export const PlayerAvatar = memo(function PlayerAvatar({
  uri,
  size,
  height: heightProp,
  variant = "gold",
  borderRadius: borderRadiusProp,
  fallbackLabel = "?",
  style,
}: PlayerAvatarProps) {
  const h = heightProp ?? size;
  const trimmed = uri?.trim();
  const showPhoto = Boolean(trimmed);
  const borderRadius =
    borderRadiusProp ?? (variant === "ice" ? 20 : 10);

  if (variant === "ice") {
    return (
      <View style={style}>
        <View style={[iceStyles.shadowWrap, { width: size, height: h, borderRadius }]}>
          <View style={[iceStyles.shell, { width: size, height: h, borderRadius }]}>
            <LinearGradient
              colors={["rgba(210, 235, 255, 0.11)", "rgba(40, 75, 120, 0.22)"]}
              locations={[0, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <View style={iceStyles.content}>
              {showPhoto ? (
                <Image source={{ uri: trimmed! }} style={iceStyles.photo} resizeMode="cover" />
              ) : (
                <View style={iceStyles.monogramWrap}>
                  <Text style={iceStyles.monogram} allowFontScaling={false}>
                    {fallbackLabel}
                  </Text>
                </View>
              )}
            </View>
            <LinearGradient
              colors={["rgba(230, 245, 255, 0.14)", "rgba(255, 255, 255, 0.02)", "rgba(6, 18, 40, 0.28)"]}
              locations={[0, 0.42, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={style}>
      <PlayerPortraitGoldFrame width={size} height={h} borderRadius={borderRadius}>
        {showPhoto ? (
          <Image source={{ uri: trimmed! }} style={goldStyles.photo} resizeMode="cover" />
        ) : (
          <View style={goldStyles.monogramWrap}>
            <Text style={goldStyles.monogram} allowFontScaling={false}>
              {fallbackLabel}
            </Text>
          </View>
        )}
      </PlayerPortraitGoldFrame>
    </View>
  );
});

const iceStyles = StyleSheet.create({
  shadowWrap: {
    ...Platform.select({
      ios: {
        shadowColor: "#6EC6FF",
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  shell: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1.5,
    borderColor: "rgba(180,220,255,0.35)",
    overflow: "hidden",
  },
  content: {
    ...StyleSheet.absoluteFillObject,
  },
  photo: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(18, 42, 78, 0.35)",
  },
  monogramWrap: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(22, 48, 88, 0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  monogram: {
    fontSize: 24,
    fontWeight: "600",
    color: "rgba(200, 230, 255, 0.42)",
  },
});

/** Как в паспорте — без изменений для `variant="gold"`. */
const goldStyles = StyleSheet.create({
  photo: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(25,40,65,0.9)",
  },
  monogramWrap: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(25,40,65,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  monogram: {
    fontSize: 24,
    fontWeight: "600",
    color: "rgba(255,255,255,0.2)",
  },
});

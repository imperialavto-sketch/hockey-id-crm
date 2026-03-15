import React, { useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";
import { PlayerCardGenerator } from "./PlayerCardGenerator";
import {
  type CardRarity,
  CARD_RARITY_STYLES,
} from "@/constants/cardRarity";

export interface PlayerCardRevealData {
  fullName: string;
  firstName: string;
  lastName: string;
  number: number;
  position: string;
  birthYear: number;
  team: string;
  photo?: ImageSourcePropType | { uri: string } | null;
  stats: { games: number; goals: number; assists: number; points: number };
  attributes: {
    skating: number;
    shooting: number;
    passing: number;
    hockeyIQ: number;
    defense?: number;
    strength?: number;
  };
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 48, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface PlayerCardRevealProps {
  playerName: string;
  number: number;
  position: string;
  cardImage?: ImageSourcePropType;
  usePreMadeCard?: boolean;
  playerData?: PlayerCardRevealData;
  rarity?: CardRarity;
  onRevealComplete?: () => void;
}

const PARTICLE_POSITIONS = [
  { left: "15%" as const, top: "35%" as const },
  { right: "20%" as const, top: "30%" as const },
  { left: "25%" as const, bottom: "25%" as const },
  { right: "15%" as const, bottom: "30%" as const },
  { left: "40%" as const, top: "20%" as const },
  { right: "35%" as const, top: "45%" as const },
  { left: "30%" as const, bottom: "15%" as const },
  { right: "25%" as const, bottom: "20%" as const },
];

export function PlayerCardReveal({
  playerName,
  number,
  position,
  cardImage = PLAYER_MARK_GOLYSH.image ? { uri: PLAYER_MARK_GOLYSH.image } : undefined,
  usePreMadeCard = true,
  playerData,
  rarity = "gold",
  onRevealComplete,
}: PlayerCardRevealProps) {
  const closedCardScale = useSharedValue(0.8);
  const closedCardOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const flipRotation = useSharedValue(180);
  const particleOpacity = useSharedValue(0);
  const revealedCardScale = useSharedValue(0.8);
  const revealedCardOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0.6);

  const rarityStyle = CARD_RARITY_STYLES[rarity];

  useEffect(() => {
    closedCardScale.value = withDelay(
      400,
      withSpring(1, { damping: 16, stiffness: 120 })
    );
    closedCardOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    glowOpacity.value = withDelay(800, withTiming(0.95, { duration: 700 }));
    particleOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
  }, []);

  const handleTap = () => {
    glowOpacity.value = withTiming(1.15, { duration: 200 });
    flipRotation.value = withSequence(
      withTiming(0, { duration: 600 }),
      withTiming(0, { duration: 0 })
    );
    revealedCardScale.value = withDelay(
      400,
      withSpring(1, { damping: 14, stiffness: 100 })
    );
    revealedCardOpacity.value = withDelay(350, withTiming(1, { duration: 400 }));
    glowPulse.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(0.95, { duration: 1500 }),
          withTiming(0.6, { duration: 1500 })
        ),
        -1,
        true
      )
    );
    if (onRevealComplete) {
      setTimeout(() => onRevealComplete(), 800);
    }
  };

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * glowPulse.value,
  }));

  const closedCardAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [180, 0], [0, 180]);
    const backOpacity =
      closedCardOpacity.value *
      interpolate(flipRotation.value, [180, 90], [1, 0]);
    return {
      opacity: backOpacity,
      transform: [
        { perspective: 1200 },
        { scale: closedCardScale.value },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  const frontCardAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [180, 0], [180, 0]);
    const frontOpacity = interpolate(
      flipRotation.value,
      [180, 90],
      [0, 1]
    );
    return {
      opacity: frontOpacity * revealedCardOpacity.value,
      transform: [
        { perspective: 1200 },
        { scale: revealedCardScale.value },
        { rotateY: `${rotateY}deg` },
      ],
    };
  });

  const particleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
  }));

  const FrontContent =
    usePreMadeCard || !playerData ? (
      <Image
        source={cardImage}
        style={styles.revealedImage}
        resizeMode="contain"
      />
    ) : (
      <View style={styles.generatorWrap}>
        <PlayerCardGenerator
          photo={playerData.photo}
          name={playerData.firstName}
          surname={playerData.lastName}
          number={playerData.number}
          position={playerData.position}
          birthYear={playerData.birthYear}
          team={playerData.team}
          rating={76}
          stats={playerData.stats}
          attributes={{
            skating: playerData.attributes.skating,
            shooting: playerData.attributes.shooting,
            passing: playerData.attributes.passing,
            hockeyIQ: playerData.attributes.hockeyIQ,
            defense: playerData.attributes.defense,
            strength: playerData.attributes.strength,
          }}
          rarity={rarity}
        />
      </View>
    );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glowWrap, glowAnimatedStyle]}>
        <LinearGradient
          colors={rarityStyle.glowGradient as [string, string, string]}
          style={[styles.glow]}
        />
      </Animated.View>

      {PARTICLE_POSITIONS.map((pos, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            pos,
            particleAnimatedStyle,
            { backgroundColor: rarityStyle.particle },
          ]}
        />
      ))}

      <View style={styles.cardContainer}>
        <Pressable onPress={handleTap} style={styles.tapArea}>
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardBack,
              closedCardAnimatedStyle,
              { borderColor: rarityStyle.border },
            ]}
          >
            <LinearGradient
              colors={["#0f172a", "#1e293b", "#0f172a"]}
              style={[styles.cardBackGradient, { borderColor: rarityStyle.border }]}
            >
              <View style={styles.cardBackInner}>
                <Text style={styles.cardBackLabel}>HOCKEY ID</Text>
                <Text
                  style={[styles.rarityBadge, { color: rarityStyle.border }]}
                >
                  {rarityStyle.label}
                </Text>
                <Text style={styles.cardBackHint}>Нажмите, чтобы открыть</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View
            style={[styles.cardFace, styles.cardFront, frontCardAnimatedStyle]}
          >
            {FrontContent}
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  glowWrap: {
    position: "absolute",
    width: CARD_WIDTH + 140,
    height: CARD_HEIGHT + 140,
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  tapArea: {
    flex: 1,
  },
  cardFace: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backfaceVisibility: "hidden" as const,
  },
  cardBack: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    shadowColor: "#2EA7FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  cardBackGradient: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBackInner: {
    alignItems: "center",
  },
  cardBackLabel: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 4,
  },
  rarityBadge: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 12,
  },
  cardBackHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "600",
  },
  cardFront: {
    borderRadius: 24,
    overflow: "hidden",
  },
  revealedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  generatorWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    overflow: "hidden",
  },
});

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

interface TimelineHeroProps {
  name: string;
  number: string;
  team: string;
  age: number;
  city: string;
  image: string;
  ovr: number;
  games: number;
  goals: number;
  assists: number;
}

export function TimelineHero({
  name,
  number,
  team,
  age,
  city,
  image,
  ovr,
  games,
  goals,
  assists,
}: TimelineHeroProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        marginBottom: 24,
      }}
    >
      <View style={styles.card}>
        <View style={styles.cardFrame} />
        <ImageBackground
          source={{ uri: image }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={[
              "transparent",
              "rgba(2,6,23,0.25)",
              "rgba(2,6,23,0.9)",
            ]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              "rgba(37,99,235,0.18)",
              "transparent",
              "rgba(239,68,68,0.12)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.25)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.content}>
            <View style={styles.top}>
              <Text style={styles.number}>{number}</Text>
              {Platform.OS === "web" ? (
                <View style={[styles.ovrBadge, styles.ovrWeb]}>
                  <Text style={styles.ovrText}>OVR {ovr}</Text>
                </View>
              ) : (
                <BlurView intensity={24} tint="dark" style={styles.ovrBadge}>
                  <Text style={styles.ovrText}>OVR {ovr}</Text>
                </BlurView>
              )}
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.meta}>{team}  •  {age} years  •  {city}</Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{games}</Text>
                <Text style={styles.statLabel}>GP</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{goals}</Text>
                <Text style={styles.statLabel}>G</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{assists}</Text>
                <Text style={styles.statLabel}>A</Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    height: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  cardFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    zIndex: 1,
    pointerEvents: "none",
  },
  image: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  imageStyle: {
    borderRadius: 19,
  },
  content: {},
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  number: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  ovrBadge: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ovrWeb: {
    backgroundColor: "rgba(2,6,23,0.8)",
  },
  ovrText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  name: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  meta: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
    letterSpacing: 0.15,
    fontWeight: "600",
  },
  stats: {
    flexDirection: "row",
    gap: 24,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
});

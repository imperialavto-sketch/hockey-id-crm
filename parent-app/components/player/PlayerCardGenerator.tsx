import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  type CardRarity,
  CARD_RARITY_STYLES,
} from "@/constants/cardRarity";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 48, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

export interface PlayerCardGeneratorProps {
  photo?: ImageSourcePropType | { uri: string } | null;
  name: string;
  surname: string;
  number: number;
  rating?: number;
  position: string;
  birthYear?: number;
  team: string;
  stats?: {
    games: number;
    goals: number;
    assists: number;
    points: number;
  };
  attributes?: {
    skating?: number;
    shooting?: number;
    passing?: number;
    hockeyIQ?: number;
    defense?: number;
    strength?: number;
  };
  rarity?: CardRarity;
}

export function PlayerCardGenerator({
  photo,
  name,
  surname,
  number,
  rating = 76,
  position,
  birthYear,
  team,
  stats = { games: 0, goals: 0, assists: 0, points: 0 },
  attributes = {},
  rarity = "gold",
}: PlayerCardGeneratorProps) {
  const rarityStyle = CARD_RARITY_STYLES[rarity];
  const {
    skating = 76,
    shooting = 75,
    passing = 79,
    hockeyIQ = 73,
    defense = 65,
    strength = 60,
  } = attributes;

  const fullName = `${surname} ${name}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.shadowWrap}>
        <LinearGradient
          colors={["#0a0f1a", "#0d1525", "#0f1829", "#0a0f1a"]}
          style={[styles.gradient, { borderColor: rarityStyle.border }]}
        >
          <View
            style={[
              styles.borderGlow,
              { borderColor: rarityStyle.border, opacity: 0.8 },
            ]}
          />
          <View style={styles.inner}>
            <View style={styles.topRow}>
              <View style={styles.ovrBadge}>
                <Text style={styles.ovrLabel}>OVR</Text>
                <Text style={styles.ovrValue}>{rating}</Text>
              </View>
            </View>

            <View style={styles.photoFrame}>
              {photo ? (
                <Image
                  source={typeof photo === "object" && "uri" in photo ? photo : (photo as ImageSourcePropType)}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.placeholderText}>Фото игрока</Text>
                </View>
              )}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
                style={styles.photoOverlay}
              />
            </View>

            <View style={styles.bottomRow}>
              <Text style={styles.number}>{number}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.position}>{position}</Text>
              {team ? (
                <Text style={styles.team} numberOfLines={1}>
                  {team}
                </Text>
              ) : null}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statMini}>
                <Text style={styles.statMiniValue}>{stats.games}</Text>
                <Text style={styles.statMiniLabel}>GP</Text>
              </View>
              <View style={styles.statMini}>
                <Text style={styles.statMiniValue}>{stats.goals}</Text>
                <Text style={styles.statMiniLabel}>G</Text>
              </View>
              <View style={styles.statMini}>
                <Text style={styles.statMiniValue}>{stats.assists}</Text>
                <Text style={styles.statMiniLabel}>A</Text>
              </View>
              <View style={[styles.statMini, styles.statMiniAccent]}>
                <Text style={styles.statMiniValueAccent}>{stats.points}</Text>
                <Text style={styles.statMiniLabel}>PTS</Text>
              </View>
            </View>

            <View style={styles.attrsGrid}>
              <View style={styles.attrCell}>
                <Text style={styles.attrLabel}>SKT</Text>
                <Text style={styles.attrValue}>{skating}</Text>
              </View>
              <View style={styles.attrCell}>
                <Text style={styles.attrLabel}>SHT</Text>
                <Text style={styles.attrValue}>{shooting}</Text>
              </View>
              <View style={styles.attrCell}>
                <Text style={styles.attrLabel}>PAS</Text>
                <Text style={styles.attrValue}>{passing}</Text>
              </View>
              <View style={styles.attrCell}>
                <Text style={styles.attrLabel}>IQ</Text>
                <Text style={styles.attrValue}>{hockeyIQ}</Text>
              </View>
              <View style={styles.attrCell}>
                <Text style={styles.attrLabel}>DEF</Text>
                <Text style={styles.attrValue}>{defense}</Text>
              </View>
              <View style={styles.attrCell}>
                <Text style={styles.attrLabel}>STR</Text>
                <Text style={styles.attrValue}>{strength}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    alignSelf: "center",
  },
  shadowWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  gradient: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  inner: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  ovrBadge: {
    backgroundColor: "rgba(251,191,36,0.2)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.45)",
    alignItems: "center",
  },
  ovrLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  ovrValue: {
    color: "#FCD34D",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    textShadowColor: "rgba(251,191,36,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  photoFrame: {
    width: "100%",
    aspectRatio: 0.85,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 14,
    fontWeight: "600",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  number: {
    color: "rgba(255,255,255,0.96)",
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -2,
    lineHeight: 48,
  },
  name: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 4,
    textAlign: "center",
  },
  position: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  team: {
    color: "rgba(148,163,184,0.7)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statMini: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 2,
  },
  statMiniAccent: {
    backgroundColor: "rgba(46,167,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(46,167,255,0.25)",
  },
  statMiniValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  statMiniValueAccent: {
    color: "#2EA7FF",
    fontSize: 18,
    fontWeight: "900",
  },
  statMiniLabel: {
    color: "rgba(148,163,184,0.8)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  attrsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attrCell: {
    flex: 1,
    minWidth: "30%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  attrLabel: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  attrValue: {
    color: "#2EA7FF",
    fontSize: 16,
    fontWeight: "900",
  },
});

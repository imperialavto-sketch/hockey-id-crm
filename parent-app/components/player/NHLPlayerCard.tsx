import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = Math.min(width - 40, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export interface NHLPlayerCardProps {
  playerName: string;
  playerNumber: number;
  position: string;
  rating: number;
  photo: ImageSourcePropType | null;
  attributes?: {
    skating?: number;
    shooting?: number;
    passing?: number;
    hockeyIQ?: number;
  };
}

export function NHLPlayerCard({
  playerName,
  playerNumber,
  position,
  rating,
  photo,
  attributes = {},
}: NHLPlayerCardProps) {
  const {
    skating = 76,
    shooting = 75,
    passing = 79,
    hockeyIQ = 73,
  } = attributes;

  return (
    <View style={styles.cardWrap}>
      <LinearGradient
        colors={[
          "#0a0f1a",
          "#0d1525",
          "#0f1829",
          "#0a0f1a",
        ]}
        style={styles.gradient}
      >
        <View style={styles.borderGlow} />
        <View style={styles.inner}>

          {/* Top: OVR rating */}
          <View style={styles.topRow}>
            <View style={styles.ovrBadge}>
              <Text style={styles.ovrLabel}>OVR</Text>
              <Text style={styles.ovrValue}>{rating}</Text>
            </View>
          </View>

          {/* Center: Player photo */}
          <View style={styles.photoFrame}>
            {photo ? (
              <Image
                source={photo}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.placeholderText}>Фото игрока</Text>
              </View>
            )}
          </View>

          {/* Bottom: Number, name, position */}
          <View style={styles.bottomRow}>
            <Text style={styles.number}>{playerNumber}</Text>
            <Text style={styles.name} numberOfLines={1}>{playerName}</Text>
            <Text style={styles.position}>{position}</Text>
          </View>

          {/* Attributes grid */}
          <View style={styles.attrsGrid}>
            <View style={styles.attrCell}>
              <Text style={styles.attrLabel}>SKATING</Text>
              <Text style={styles.attrValue}>{skating}</Text>
            </View>
            <View style={styles.attrCell}>
              <Text style={styles.attrLabel}>SHOOTING</Text>
              <Text style={styles.attrValue}>{shooting}</Text>
            </View>
            <View style={styles.attrCell}>
              <Text style={styles.attrLabel}>PASSING</Text>
              <Text style={styles.attrValue}>{passing}</Text>
            </View>
            <View style={styles.attrCell}>
              <Text style={styles.attrLabel}>HOCKEY IQ</Text>
              <Text style={styles.attrValue}>{hockeyIQ}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    alignSelf: "center",
    ...{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 16,
      elevation: 12,
    },
  },
  gradient: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(46,167,255,0.2)",
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
    marginBottom: 16,
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
  bottomRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  number: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -2,
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
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  attrsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  attrCell: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 10,
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
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
});

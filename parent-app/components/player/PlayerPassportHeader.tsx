import React from "react";
import { View, Text, Image, StyleSheet, ImageSourcePropType } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors, spacing, shadows } from "@/constants/theme";

export interface PlayerPassportHeaderProps {
  photo?: ImageSourcePropType | { uri: string } | null;
  fullName: string;
  firstName?: string;
  lastName?: string;
  team?: string;
  position?: string;
  number?: number | string;
  age?: number;
  birthYear?: number;
  playerId?: string;
  status?: string;
  verified?: boolean;
}

const POSITION_MAP: Record<string, string> = {
  Forward: "Нападающий",
  Defenseman: "Защитник",
  Goaltender: "Вратарь",
  Center: "Центр",
};

function translatePosition(pos: string): string {
  return POSITION_MAP[pos] ?? pos;
}

function getMonogram(firstName?: string, lastName?: string, fullName?: string): string {
  if (firstName && lastName) return `${lastName[0]}${firstName[0]}`;
  const parts = (fullName ?? "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] ?? "") + (parts[1][0] ?? "");
  return (fullName?.[0] ?? "").toUpperCase();
}

/**
 * Official premium hockey identity header.
 */
export function PlayerPassportHeader({
  photo,
  fullName,
  firstName,
  lastName,
  team,
  position,
  number,
  age,
  birthYear,
  playerId,
  status = "active",
  verified = true,
}: PlayerPassportHeaderProps) {
  const photoSource = photo && typeof photo === "object" && "uri" in photo ? photo : null;
  const monogram = getMonogram(firstName, lastName, fullName);
  const displayNumber = number != null ? (typeof number === "number" ? `#${number}` : number) : null;

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.topBar}>
          <View style={styles.topLabelRow}>
            <View style={styles.labelAccent} />
            <Text style={styles.passportLabel}>PLAYER PASSPORT</Text>
          </View>
          {playerId ? (
            <Text style={styles.idLabel}>ID {playerId}</Text>
          ) : null}
        </View>

        <View style={styles.photoRow}>
          <View style={styles.photoWrap}>
            {photoSource ? (
              <Image source={photoSource} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.monogramWrap}>
                <Text style={styles.monogram}>{monogram}</Text>
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.playerName}>{fullName}</Text>
            {(team || position) && (
              <Text style={styles.metaText}>
                {[team, position ? translatePosition(position) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
            {(displayNumber || age || birthYear) && (
              <Text style={styles.metaSecondary}>
                {[displayNumber, age ? `${age} лет` : null, birthYear ? birthYear : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
            <View style={styles.badgesRow}>
              {verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              {status && status !== "active" && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xxl,
  },
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(18,30,52,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...shadows.level1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  topLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  labelAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  passportLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.4)",
  },
  idLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  photoRow: {
    flexDirection: "row",
    padding: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  photoWrap: {
    position: "relative",
    marginRight: spacing.lg,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: "rgba(25,40,65,0.9)",
  },
  monogramWrap: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: "rgba(25,40,65,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  monogram: {
    fontSize: 24,
    fontWeight: "600",
    color: "rgba(255,255,255,0.2)",
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  playerName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaSecondary: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  badgesRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  verifiedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});

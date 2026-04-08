import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatPlayerNumber, hasJerseyNumber } from "@/lib/playerJerseyNumber";

export type HeroJerseyIdentityVariant = "home" | "player";

/**
 * Декоративный номер в отдельной зоне hero — только типографика, без подложек.
 * - `player`: правая колонка.
 * - `home`: крупный полупрозрачный акцент (без градиентов и фона под текстом).
 */
export const HeroJerseyIdentityAccent = memo(function HeroJerseyIdentityAccent({
  jerseyNumber,
  variant,
}: {
  jerseyNumber: number;
  variant: HeroJerseyIdentityVariant;
}) {
  if (!hasJerseyNumber(jerseyNumber)) return null;
  const label = formatPlayerNumber(jerseyNumber);
  const isPlayer = variant === "player";

  return (
    <View
      style={[styles.wrap, isPlayer ? styles.wrapPlayer : styles.wrapHome]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={isPlayer ? styles.textPlayer : styles.textHome}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    justifyContent: "center",
  },
  wrapPlayer: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  wrapHome: {
    alignItems: "flex-start",
    justifyContent: "flex-end",
    alignSelf: "stretch",
    width: "100%",
    overflow: "hidden",
    paddingTop: 4,
    paddingBottom: 2,
  },
  textPlayer: {
    fontSize: 58,
    lineHeight: 60,
    fontWeight: "800",
    letterSpacing: -2.2,
    textAlign: "right",
    color: "rgba(214, 232, 255, 0.62)",
    flexShrink: 0,
  },
  textHome: {
    fontSize: 94,
    lineHeight: 98,
    fontWeight: "900",
    letterSpacing: -4.5,
    textAlign: "left",
    color: "rgba(207, 230, 255, 0.24)",
  },
});

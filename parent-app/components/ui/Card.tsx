import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, cardStyles, spacing } from "@/constants/theme";

type Props = {
  children: React.ReactNode;
  style?: object;
};

export function Card({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cardStyles.backgroundColor,
    borderRadius: cardStyles.radius,
    padding: cardStyles.padding,
    marginBottom: spacing[16],
    borderWidth: cardStyles.borderWidth,
    borderColor: cardStyles.borderColor,
    ...(cardStyles.shadow as object),
  },
});

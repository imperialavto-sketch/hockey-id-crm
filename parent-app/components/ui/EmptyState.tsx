import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
};

export function EmptyState({
  icon,
  title,
  subtitle,
  buttonLabel,
  onButtonPress,
}: Props) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonLabel && onButtonPress ? (
        <View style={styles.buttonWrap}>
          <PrimaryButton label={buttonLabel} onPress={onButtonPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    alignItems: "center",
    backgroundColor: colors.surfaceLightAlt,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  iconWrap: {
    marginBottom: spacing.xl,
    opacity: 0.85,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  buttonWrap: {
    width: "100%",
    maxWidth: 280,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
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
    paddingVertical: spacing[32],
    paddingHorizontal: spacing[24],
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    marginHorizontal: spacing[20],
    marginVertical: spacing[16],
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  iconWrap: {
    marginBottom: spacing[20],
    opacity: 0.8,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing[8],
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing[24],
  },
  buttonWrap: {
    width: "100%",
    maxWidth: 280,
  },
});

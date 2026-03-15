import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";

interface UpgradeCTAProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
}

export function UpgradeCTA({ title, subtitle, onPress }: UpgradeCTAProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={24} color={colors.accent} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    padding: spacing[20],
    marginVertical: spacing[12],
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.9 },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

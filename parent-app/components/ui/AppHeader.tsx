import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { colors, spacing, typography } from "@/constants/theme";

type Props = {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
};

export function AppHeader({ title, showBack = true, rightAction }: Props) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <ChevronLeft size={28} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Text style={styles.title}>{title}</Text>
      {rightAction ? (
        <View style={styles.right}>{rightAction}</View>
      ) : (
        <View style={styles.backBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    marginBottom: spacing[16],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  right: { minWidth: 44, alignItems: "flex-end" },
  pressed: { opacity: 0.7 },
  title: {
    flex: 1,
    ...typography.section,
    color: colors.text,
    marginLeft: 8,
  },
});

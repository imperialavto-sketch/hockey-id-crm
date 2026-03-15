import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/constants/theme";

export function AnalysisEmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="videocam-outline" size={40} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>
        Загрузите короткий игровой эпизод, чтобы получить AI-анализ
      </Text>
      <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.88 }]} onPress={onPress}>
        <Text style={styles.btnText}>Выбрать видео</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
  },
  iconWrap: { marginBottom: spacing.md },
  title: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  btn: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 16, fontWeight: "600", color: "#ffffff" },
});

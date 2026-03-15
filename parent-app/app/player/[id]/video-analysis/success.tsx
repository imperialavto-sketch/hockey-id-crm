import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { screenReveal } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRESSED_OPACITY = 0.88;

export default function VideoAnalysisSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, analysisId } = useLocalSearchParams<{ id: string; analysisId: string }>();

  const header = (
    <View style={[styles.customHeader, { paddingTop: insets.top + spacing.lg }]}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: PRESSED_OPACITY }]}
        onPress={() => {
          triggerHaptic();
          router.back();
        }}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </Pressable>
      <Text style={styles.headerTitle}>Загрузка</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  const openStatus = () => {
    triggerHaptic();
    id && analysisId && router.replace(`/player/${id}/video-analysis/${analysisId}`);
  };

  const goToList = () => {
    triggerHaptic();
    id && router.replace(`/player/${id}/video-analysis`);
  };

  return (
    <FlagshipScreen header={header} scroll={false}>
      <View style={styles.content}>
        <Animated.View entering={screenReveal(0)} style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        </Animated.View>
        <Animated.View entering={screenReveal(120)}>
          <Text style={styles.title}>Видео отправлено</Text>
          <Text style={styles.subtitle}>
            Загрузка завершена, анализ уже выполняется.
          </Text>
        </Animated.View>

        <Animated.View entering={screenReveal(200)} style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={openStatus}
          >
            <Text style={styles.primaryBtnText}>Открыть статус</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={goToList}
          >
            <Text style={styles.secondaryBtnText}>К списку анализов</Text>
          </Pressable>
        </Animated.View>
      </View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", lineHeight: 22, color: "#ffffff" },
  headerBtn: { width: 40, height: 40 },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  iconWrap: { marginBottom: spacing.xl },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  buttons: {
    width: "100%",
    maxWidth: 320,
    gap: spacing.md,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { fontSize: 16, fontWeight: "600", color: "#ffffff" },
  secondaryBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "600", color: colors.textSecondary },
});

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

const SETTINGS_ITEMS = [
  {
    label: "Уведомления",
    description: "Сообщения, расписание, достижения",
    path: "/notifications",
    icon: "notifications-outline" as const,
  },
  {
    label: "Подписка и оплаты",
    description: "Тариф, способ оплаты, история",
    path: "/profile/billing",
    icon: "card-outline" as const,
  },
  {
    label: "Мои бронирования",
    description: "Занятия с тренерами",
    path: "/bookings",
    icon: "calendar-outline" as const,
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
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
      <View style={styles.headerCenter}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="settings-outline" size={24} color={colors.accent} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Настройки</Text>
          <Text style={styles.headerSub}>Управление приложением</Text>
        </View>
      </View>
      <View style={styles.backBtn} />
    </View>
  );

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <SectionCard title="Основное" style={styles.sectionCard}>
          {SETTINGS_ITEMS.map((item, index) => (
            <Animated.View
              key={item.path}
              entering={screenReveal(STAGGER + index * 40)}
            >
              <ActionLinkCard
                icon={item.icon}
                title={item.label}
                description={item.description}
                onPress={() => {
                  triggerHaptic();
                  router.push(item.path as never);
                }}
                variant="default"
              />
            </Animated.View>
          ))}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <SectionCard title="О приложении" style={styles.sectionCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Версия</Text>
            <Text style={styles.aboutValue}>{appVersion}</Text>
          </View>
        </SectionCard>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: -8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  sectionCard: { marginBottom: spacing.xl },

  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  aboutLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  aboutValue: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
  },
});

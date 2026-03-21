import React from "react";
import { View, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { FormRow } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { spacing } from "@/constants/theme";

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

  const header = (
    <ScreenHeader
      title="Настройки"
      subtitle="Управление приложением"
      onBack={() => {
        triggerHaptic();
        router.back();
      }}
    />
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
          <FormRow label="Версия" value={appVersion} />
        </SectionCard>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  sectionCard: { marginBottom: spacing.xl },
});

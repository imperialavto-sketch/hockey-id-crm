import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import Animated from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getPlayers } from "@/services/playerService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { ActionLinkCard } from "@/components/player/ActionLinkCard";
import { PremiumBlock } from "@/components/subscription/PremiumBlock";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { Player } from "@/types";

const PRESSED_OPACITY = 0.88;

const HUB_ITEMS: { label: string; path: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { label: "Лента", path: "/(tabs)/feed", icon: "newspaper-outline", description: "Новости и объявления" },
  { label: "Тренеры", path: "/(tabs)/marketplace", icon: "fitness-outline", description: "Найти тренера и забронировать" },
  { label: "Уведомления", path: "/notifications", icon: "notifications-outline", description: "Сообщения и активность" },
  { label: "Подписка и оплаты", path: "/profile/billing", icon: "card-outline", description: "Тариф и способ оплаты" },
  { label: "Мои бронирования", path: "/bookings", icon: "calendar-outline", description: "Занятия с тренерами" },
  { label: "Все настройки", path: "/profile/settings", icon: "settings-outline", description: "Подробные настройки приложения" },
];

function MoreSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={180} style={styles.skeletonCard} />
      <SkeletonBlock height={80} style={styles.skeletonCard} />
      <SkeletonBlock height={160} style={styles.skeletonCard} />
      <SkeletonBlock height={56} style={styles.skeletonButton} />
    </View>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      if (mountedRef.current) {
        setPlayer(null);
        setLoading(false);
      }
      return;
    }
    if (mountedRef.current) {
      setLoading(true);
      setError(false);
    }
    try {
      const players = await getPlayers(user.id);
      if (mountedRef.current) setPlayer(players[0] ?? null);
    } catch {
      if (mountedRef.current) {
        setPlayer(null);
        setError(true);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleLogout = () => {
    Alert.alert("Выход", "Вы уверены, что хотите выйти?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          triggerHaptic();
          if (mountedRef.current) setLoggingOut(true);
          try {
            await logout();
            router.replace("/(auth)/login");
          } finally {
            if (mountedRef.current) setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const goTo = (path: string) => {
    triggerHaptic();
    router.push(path as never);
  };

  if (loading) {
    return (
      <FlagshipScreen>
        <MoreSkeleton />
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={loadProfile}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  const displayName = user?.name ?? "Родитель";
  const displayPhone = user?.phone ?? "";
  const displayRole = user?.role ?? "Родитель";

  return (
    <FlagshipScreen>
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="apps-outline" size={32} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Ещё</Text>
          <Text style={styles.heroSub}>Лента, тренеры, настройки и профиль</Text>
        </View>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER)}>
        <SectionCard title="Аккаунт" style={styles.accountCard}>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileRole}>{displayRole}</Text>
          {displayPhone ? (
            <Text style={styles.profilePhone}>{displayPhone}</Text>
          ) : null}
          <View style={styles.divider} />
          {player ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ребёнок</Text>
                <Text style={styles.infoValue}>{player.name ?? "—"}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <Text style={styles.infoLabel}>Команда</Text>
                <Text style={styles.infoValue}>{player.team ?? "—"}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Данные игрока</Text>
              <Text style={styles.infoValue}>—</Text>
            </View>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 2)}>
        <PremiumBlock />
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 3)}>
        <SectionCard title="Разделы" style={styles.menuCard}>
          {HUB_ITEMS.map((item) => (
            <ActionLinkCard
              key={item.path}
              icon={item.icon}
              title={item.label}
              description={item.description}
              onPress={() => goTo(item.path)}
              variant="default"
            />
          ))}
        </SectionCard>
      </Animated.View>

      <Animated.View entering={screenReveal(STAGGER * 4)}>
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: PRESSED_OPACITY }]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutBtnText}>
            {loggingOut ? "Выход…" : "Выйти"}
          </Text>
        </Pressable>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  skeletonContent: { gap: spacing.xl },
  skeletonCard: { borderRadius: radius.lg },
  skeletonButton: { borderRadius: radius.sm, marginTop: spacing.md },

  errorWrap: { flex: 1 },
  heroSection: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: { ...typography.sectionTitle, color: colors.text, marginBottom: spacing.xs },
  heroSub: { ...typography.caption, color: colors.textSecondary },

  accountCard: { marginBottom: spacing.xl },
  profileName: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  profileRole: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  profilePhone: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { ...typography.bodySmall, color: colors.textMuted },
  infoValue: { ...typography.body, color: colors.text },

  menuCard: { marginBottom: spacing.xl },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSoft,
  },
  logoutBtnText: {
    ...typography.body,
    fontWeight: "600",
    color: colors.error,
  },
});

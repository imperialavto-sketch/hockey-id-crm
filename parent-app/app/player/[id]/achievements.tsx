import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getFullPlayerProfile } from "@/services/playerService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { AchievementBadge } from "@/components/player-passport";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { AchievementsResponse } from "@/types";

const PRESSED_OPACITY = 0.88;
type ScreenErrorKind = "not_found" | "network";

const ERROR_CONTENT: Record<
  ScreenErrorKind,
  { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }
> = {
  not_found: {
    icon: "trophy-outline",
    title: "Игрок не найден",
    subtitle: "Проверьте ссылку или выберите другого игрока",
  },
  network: {
    icon: "cloud-offline-outline",
    title: "Не удалось загрузить достижения",
    subtitle: "Проверьте подключение и попробуйте снова",
  },
};

function AchievementsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={180} style={styles.skeletonSection} />
      <SkeletonBlock height={200} style={styles.skeletonSection} />
    </View>
  );
}

function AchievementCard({
  item,
  unlocked,
  index,
}: {
  item: { id: string; icon: string; title: string; description: string; progressValue?: number; conditionValue?: number };
  unlocked: boolean;
  index: number;
}) {
  return (
    <Animated.View entering={screenReveal(STAGGER + index * 50)}>
      <AchievementBadge
        icon={item.icon}
        title={item.title}
        description={item.description}
        unlocked={unlocked}
        progressValue={item.progressValue}
        conditionValue={item.conditionValue}
      />
    </Animated.View>
  );
}

export default function PlayerAchievementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ScreenErrorKind | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    const canCommit = () => mountedRef.current && requestId === requestRef.current;

    if (!id || typeof id !== "string") {
      if (canCommit()) {
        setAchievements(null);
        setError("not_found");
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    if (!user?.id) {
      if (canCommit()) {
        setAchievements(null);
        setError("network");
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    if (canCommit()) {
      setError(null);
    }

    try {
      const profile = await getFullPlayerProfile(id, user.id, {
        includeVideoAnalyses: false,
      });

      if (!canCommit()) return;

      if (!profile) {
        setAchievements(null);
        setError("not_found");
        return;
      }

      setAchievements(profile.achievements ?? null);
    } catch {
      if (canCommit()) {
        setAchievements(null);
        setError("network");
      }
    } finally {
      if (canCommit()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (id && user?.id) load();
    }, [load, id, user?.id])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

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
          <Ionicons name="trophy" size={24} color={colors.accent} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Достижения</Text>
          <Text style={styles.headerSub}>
            {achievements
              ? `${achievements.unlocked.length} получено · ${achievements.locked.length} впереди`
              : "Значки и цели игрока"}
          </Text>
        </View>
      </View>
      <View style={styles.backBtn} />
    </View>
  );

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <AchievementsSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    const content = ERROR_CONTENT[error];

    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorContainer}>
          <Ionicons name={content.icon} size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>{content.title}</Text>
          <Text style={styles.errorSub}>{content.subtitle}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              setLoading(true);
              load();
            }}
          >
            <Text style={styles.retryBtnText}>Повторить</Text>
          </Pressable>
        </View>
      </FlagshipScreen>
    );
  }

  const isEmpty = !achievements || (achievements.unlocked.length === 0 && achievements.locked.length === 0);

  if (isEmpty) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="trophy-outline" size={56} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Пока нет достижений</Text>
          <Text style={styles.emptySub}>
            Достижения появляются за активность на льду, выполнение плана развития и рекомендаций тренера
          </Text>
        </View>
      </FlagshipScreen>
    );
  }

  const listBottomPadding = spacing.xxl + insets.bottom + 40;

  return (
    <FlagshipScreen header={header} scroll={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: listBottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {achievements!.unlocked.length > 0 && (
          <SectionCard title="Получено" style={styles.sectionCard}>
            <Text style={styles.sectionSub}>
              Игрок уже заработал эти значки
            </Text>
            <View style={styles.unlockedGrid}>
              {achievements!.unlocked.map((a, index) => (
                <AchievementCard
                  key={a.id}
                  item={a}
                  unlocked
                  index={index}
                />
              ))}
            </View>
          </SectionCard>
        )}

        {achievements!.locked.length > 0 && (
          <SectionCard
            title="Следующие цели"
            style={[
              styles.sectionCard,
              achievements!.unlocked.length > 0 && styles.sectionCardSecond,
            ]}
          >
            <Text style={styles.sectionSub}>
              Цели для новых достижений
            </Text>
            <View style={styles.lockedGrid}>
              {achievements!.locked.map((a, index) => (
                <View key={a.id} style={styles.lockedCell}>
                  <AchievementCard
                    item={a}
                    unlocked={false}
                    index={achievements!.unlocked.length + index}
                  />
                </View>
              ))}
            </View>
          </SectionCard>
        )}
      </ScrollView>
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

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  skeletonContent: { gap: spacing.xl },
  skeletonSection: { borderRadius: radius.lg },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  errorTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 14,
  },
  retryBtnText: { fontSize: 16, fontWeight: "600", color: colors.onAccent },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  sectionCard: { marginBottom: spacing.xl },
  sectionCardSecond: { marginTop: spacing.sm },
  sectionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  unlockedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginHorizontal: -4,
  },
  lockedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  lockedCell: {
    width: "50%",
    padding: 6,
  },
});

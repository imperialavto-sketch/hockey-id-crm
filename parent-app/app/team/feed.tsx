import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getTeamPosts } from "@/services/teamService";
import { getTeamEvents } from "@/services/scheduleService";
import { MOCK_TEAM_NAME } from "@/constants/mockTeamPosts";
import { TeamHeader } from "@/components/team/TeamHeader";
import { CoachAnnouncementCard } from "@/components/team/CoachAnnouncementCard";
import { TeamEventCard } from "@/components/team/TeamEventCard";
import { TeamPostCard } from "@/components/team/TeamPostCard";
import { SkeletonBlock, ErrorStateView } from "@/components/ui";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, shadows, radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

const PRESSED_OPACITY = 0.88;

function FeedSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={80} style={styles.skeletonHeader} />
      <SkeletonBlock height={56} style={styles.skeletonNav} />
      <SkeletonBlock height={120} style={styles.skeletonCard} />
      <SkeletonBlock height={100} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={180} style={styles.skeletonCard} />
    </View>
  );
}

export default function TeamFeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof getTeamPosts>>>([]);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getTeamEvents>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [postsData, eventsData] = await Promise.all([
        getTeamPosts(user?.id),
        getTeamEvents(),
      ]);
      setPosts(postsData);
      setEvents(eventsData);
    } catch {
      setPosts([]);
      setEvents([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const announcements = posts.filter((p) => p.isCoachAnnouncement);
  const otherPosts = posts.filter((p) => !p.isCoachAnnouncement);

  const goTo = (path: string) => {
    triggerHaptic();
    router.push(path as never);
  };

  const insets = useSafeAreaInsets();
  const feedHeader = (
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
      <Text style={styles.headerTitle}>Команда</Text>
      <View style={styles.headerBtn} />
    </View>
  );

  if (loading) {
    return (
      <FlagshipScreen header={feedHeader}>
        <FeedSkeleton />
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={feedHeader} scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить ленту"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={load}
          style={styles.errorContainer}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={feedHeader}>
          <Animated.View
            entering={screenReveal(0)}
          >
            <TeamHeader teamName={MOCK_TEAM_NAME} subtitle="Командная лента" />
          </Animated.View>

          {/* Nav row */}
          <Animated.View
            entering={screenReveal(STAGGER)}
            style={styles.navRow}
          >
            <Pressable
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: PRESSED_OPACITY }]}
              onPress={() => goTo("/team/chat")}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={colors.accent} />
              <Text style={styles.navBtnText}>Чат</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: PRESSED_OPACITY }]}
              onPress={() => goTo("/team/members")}
            >
              <Ionicons name="people-outline" size={20} color={colors.accent} />
              <Text style={styles.navBtnText}>Участники</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: PRESSED_OPACITY }]}
              onPress={() => goTo("/team/create-post")}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.navBtnText}>Пост</Text>
            </Pressable>
          </Animated.View>

          {announcements.length > 0 ? (
            <Animated.View
              entering={screenReveal(STAGGER * 2)}
            >
              <Text style={styles.sectionTitle}>Объявления тренера</Text>
              {announcements.map((p) => (
                <CoachAnnouncementCard
                  key={p.id}
                  post={p}
                  onPress={() => {
                    triggerHaptic();
                    router.push(`/team/announcement/${p.id}` as never);
                  }}
                />
              ))}
            </Animated.View>
          ) : null}

          <Animated.View
            entering={screenReveal(STAGGER * 3)}
          >
            <Text style={styles.sectionTitle}>Ближайшие события</Text>
            {events.length > 0 ? (
              events.slice(0, 2).map((e) => (
                <TeamEventCard key={e.id} event={e} />
              ))
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>Ближайших событий пока нет</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View
            entering={screenReveal(STAGGER * 4)}
          >
            <Text style={styles.sectionTitle}>Лента</Text>
            {otherPosts.length > 0 ? (
              otherPosts.map((p) => (
                <TeamPostCard
                  key={p.id}
                  post={p}
                  onPress={() => {
                    triggerHaptic();
                    if (p.isCoachAnnouncement) {
                      router.push(`/team/announcement/${p.id}` as never);
                    } else {
                      Alert.alert(p.author.name, p.text, [{ text: "OK" }]);
                    }
                  }}
                />
              ))
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>В ленте пока нет публикаций</Text>
                <Text style={styles.emptySub}>
                  Создайте первый пост или дождитесь новостей от тренера
                </Text>
              </View>
            )}
          </Animated.View>
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
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: "#ffffff",
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonContent: { gap: spacing.xl },
  skeletonHeader: {
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  skeletonNav: {
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  skeletonCard: {
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.gridGap,
    marginBottom: spacing.xxl,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.level1,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: -0.35,
  },
  emptySection: {
    padding: spacing.xxl,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});

import React, { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
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
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { colors, spacing, shadows, radius, typography, feedback } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

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

  const goTo = useCallback(
    (path: string) => {
      triggerHaptic();
      router.push(path as never);
    },
    [router]
  );

  const handleBack = useCallback(() => router.back(), [router]);

  const feedHeader = useMemo(
    () => <ScreenHeader title="Команда" onBack={handleBack} />,
    [handleBack]
  );

  const handleAnnouncementPress = useCallback(
    (id: string) => () => router.push(`/team/announcement/${id}` as never),
    [router]
  );

  const handlePostPress = useCallback(
    (post: { id: string; isCoachAnnouncement?: boolean; author: { name: string }; text: string }) => () => {
      triggerHaptic();
      if (post.isCoachAnnouncement) {
        router.push(`/team/announcement/${post.id}` as never);
      } else {
        Alert.alert(post.author.name, post.text, [{ text: "OK" }]);
      }
    },
    [router]
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
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: feedback.pressedOpacity }]}
              onPress={() => goTo("/team/chat")}
            >
              <Ionicons name="chatbubbles-outline" size={20} color={colors.accent} />
              <Text style={styles.navBtnText}>Чат</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: feedback.pressedOpacity }]}
              onPress={() => goTo("/team/members")}
            >
              <Ionicons name="people-outline" size={20} color={colors.accent} />
              <Text style={styles.navBtnText}>Участники</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navBtn, pressed && { opacity: feedback.pressedOpacity }]}
              onPress={() => goTo("/team/create-post")}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              <Text style={styles.navBtnText}>Пост</Text>
            </Pressable>
          </Animated.View>

          {announcements.length > 0 ? (
            <Animated.View entering={screenReveal(STAGGER * 2)} style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Объявления тренера</Text>
              {announcements.map((p) => (
                <CoachAnnouncementCard
                  key={p.id}
                  post={p}
                  onPress={handleAnnouncementPress(p.id)}
                />
              ))}
            </Animated.View>
          ) : null}

          <Animated.View
            entering={screenReveal(STAGGER * 3)}
            style={styles.sectionBlock}
          >
            <Text style={styles.sectionTitle}>Ближайшие события</Text>
            {events.length > 0 ? (
              events.slice(0, 2).map((e) => (
                <TeamEventCard key={e.id} event={e} />
              ))
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>Ближайших событий пока нет</Text>
                <Text style={styles.emptySub}>Проверяйте — тренер может добавить тренировки и игры</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View
            entering={screenReveal(STAGGER * 4)}
            style={styles.sectionBlock}
          >
            <Text style={styles.sectionTitle}>Лента</Text>
            {otherPosts.length > 0 ? (
              otherPosts.map((p) => (
                <TeamPostCard key={p.id} post={p} onPress={handlePostPress(p)} />
              ))
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>В ленте пока нет публикаций</Text>
                <Text style={styles.emptySub}>
                  Создайте первый пост или загляните позже — тренер может публиковать новости
                </Text>
              </View>
            )}
          </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
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
  sectionBlock: {
    marginTop: spacing.sectionGap,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
    ...typography.body,
    color: colors.textSecondary,
  },
  emptySub: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});

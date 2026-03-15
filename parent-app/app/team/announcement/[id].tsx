import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getTeamPostById } from "@/services/teamService";
import { isDev } from "@/config/api";
import { MOCK_TEAM_POSTS } from "@/constants/mockTeamPosts";
import { CoachAnnouncementCard } from "@/components/team/CoachAnnouncementCard";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SectionCard } from "@/components/player-passport";
import { SkeletonBlock } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, radius, spacing, typography } from "@/constants/theme";

const PRESSED_OPACITY = 0.88;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AnnouncementSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={120} style={styles.skeletonSection} />
    </View>
  );
}

export default function AnnouncementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Awaited<ReturnType<typeof getTeamPostById>>>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || typeof id !== "string") {
      setLoading(false);
      return;
    }
    const p = await getTeamPostById(id, user?.id);
    setPost(p ?? (isDev ? MOCK_TEAM_POSTS.find((x) => x.id === id) ?? null : null));
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
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
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Объявление</Text>
      <View style={styles.backBtn} />
    </View>
  );

  if (loading) {
    return (
      <FlagshipScreen header={header}>
        <Animated.View entering={screenReveal(0)}>
          <AnnouncementSkeleton />
        </Animated.View>
      </FlagshipScreen>
    );
  }

  if (!post) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.errorText}>Объявление не найдено</Text>
          <Text style={styles.errorSub}>Возможно, оно было удалено</Text>
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.cardWrap}>
          <CoachAnnouncementCard post={post} embedded />
        </View>
      </Animated.View>
      <Animated.View entering={screenReveal(STAGGER)}>
        <SectionCard title="Текст объявления" style={styles.sectionCard}>
          <Text style={styles.fullTextContent}>{post.text}</Text>
          <Text style={styles.fullTextDate}>{formatDate(post.createdAt)}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLevel1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  skeletonContent: {
    gap: spacing.xl,
    marginBottom: spacing.xxl,
  },
  skeletonCard: { borderRadius: radius.lg },
  skeletonSection: { borderRadius: radius.lg },
  cardWrap: {
    marginBottom: spacing.lg,
  },
  sectionCard: {
    marginBottom: spacing.xxl,
  },
  fullTextContent: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  fullTextDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});

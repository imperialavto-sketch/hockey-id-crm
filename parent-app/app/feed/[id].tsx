import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getFeedPost } from "@/services/feedService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, radius, radii, spacing, typography } from "@/constants/theme";
import type { FeedPostItem } from "@/types/feed";

const PRESSED_OPACITY = 0.88;

const TYPE_LABELS: Record<string, string> = {
  announcement: "Объявление",
  news: "Новость",
  schedule_update: "Расписание",
  match_day: "Матч",
  photo_post: "Фото",
};

function PostSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={32} style={styles.skeletonBadge} />
      <SkeletonBlock height={72} style={styles.skeletonTitle} />
      <SkeletonBlock height={20} style={styles.skeletonMeta} />
      <SkeletonBlock height={220} style={styles.skeletonImage} />
      <SkeletonBlock height={100} style={styles.skeletonBody} />
    </View>
  );
}

export default function FeedPostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<FeedPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id || typeof id !== "string" || !user?.id) {
      setLoading(false);
      return;
    }
    setError(false);
    setLoading(true);
    try {
      const data = await getFeedPost(id, user.id);
      setPost(data);
    } catch {
      setPost(null);
      setError(true);
    } finally {
      setLoading(false);
    }
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
      <Text style={styles.headerTitle}>Публикация</Text>
    </View>
  );

  if (!user?.id) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />
          </View>
          <Text style={styles.errorTitle}>Необходима авторизация</Text>
          <Text style={styles.errorSub}>Войдите в аккаунт для просмотра</Text>
        </View>
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen header={header}>
        <Animated.View entering={screenReveal(0)}>
          <PostSkeleton />
        </Animated.View>
      </FlagshipScreen>
    );
  }

  if (!post) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name={error ? "cloud-offline-outline" : "document-text-outline"}
              size={36}
              color={colors.textMuted}
            />
          </View>
          <Text style={styles.errorTitle}>
            {error ? "Не удалось загрузить публикацию" : "Публикация не найдена"}
          </Text>
          <Text style={styles.errorSub}>
            {error
              ? "Проверьте подключение и попробуйте снова"
              : "Возможно, она была удалена"}
          </Text>
          {error && (
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
              onPress={() => {
                triggerHaptic();
                load();
              }}
              accessibilityRole="button"
              accessibilityLabel="Повторить"
            >
              <Text style={styles.retryBtnText}>Повторить</Text>
            </Pressable>
          )}
        </View>
      </FlagshipScreen>
    );
  }

  const label = TYPE_LABELS[post.type] ?? post.type;
  const dateStr = new Date(post.createdAt).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <FlagshipScreen header={header}>
      <Animated.View entering={screenReveal(0)}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      </Animated.View>
      <Animated.View entering={screenReveal(STAGGER)}>
        <Text style={styles.title} numberOfLines={3} ellipsizeMode="tail">
          {post.title}
        </Text>
        <Text style={styles.meta}>
          {post.authorName} · {dateStr}
        </Text>
      </Animated.View>
      {post.imageUrl ? (
        <Animated.View entering={screenReveal(STAGGER * 2)}>
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </Animated.View>
      ) : null}
      <Animated.View entering={screenReveal(post.imageUrl ? STAGGER * 3 : STAGGER * 2)}>
        <Text style={styles.body}>{post.body}</Text>
      </Animated.View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
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
    marginLeft: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.onAccent,
  },
  skeletonContent: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  skeletonBadge: { borderRadius: radii.xs, alignSelf: "flex-start" },
  skeletonTitle: { borderRadius: radius.sm },
  skeletonMeta: { borderRadius: radius.sm, width: "60%" },
  skeletonImage: { borderRadius: radii.sm, backgroundColor: colors.surfaceLevel1 },
  skeletonBody: { borderRadius: radius.sm },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.xs,
    marginBottom: spacing.md,
  },
  badgeText: { fontSize: 13, fontWeight: "600", color: colors.accent },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 28,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceLevel1,
    marginBottom: spacing.lg,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});

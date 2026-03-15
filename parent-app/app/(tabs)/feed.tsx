import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getFeed } from "@/services/feedService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ErrorStateView, EmptyStateView, SkeletonBlock } from "@/components/ui";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { screenReveal, STAGGER } from "@/lib/animations";
import { colors, spacing, typography, radii, radius } from "@/constants/theme";
import type { FeedPostItem } from "@/types/feed";

const TYPE_LABELS: Record<string, string> = {
  announcement: "Объявление",
  news: "Новость",
  schedule_update: "Расписание",
  match_day: "Матч",
  photo_post: "Фото",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function FeedSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={88} style={styles.skeletonHeader} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
      <SkeletonBlock height={140} style={styles.skeletonCard} />
    </View>
  );
}

function FeedHero() {
  return (
    <Animated.View entering={screenReveal(0)}>
      <View style={styles.heroSection}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="newspaper-outline" size={28} color={colors.accent} />
        </View>
        <Text style={styles.heroTitle}>Лента</Text>
        <Text style={styles.heroSub}>
          Обновления команды и школы — новости, анонсы, фото
        </Text>
      </View>
    </Animated.View>
  );
}

function FeedCard({
  item,
  onPress,
  index,
}: {
  item: FeedPostItem;
  onPress: () => void;
  index: number;
}) {
  const label = TYPE_LABELS[item.type] ?? item.type;
  return (
    <Animated.View entering={screenReveal(STAGGER + index * 40)}>
      <AnimatedCard index={index} onPress={onPress} style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{label}</Text>
            </View>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {item.body}
          </Text>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" />
          ) : null}
          <Text style={styles.author}>{item.authorName}</Text>
        </View>
      </AnimatedCard>
    </Animated.View>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<FeedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setError(false);
    try {
      const data = await getFeed(user.id);
      setPosts(data);
    } catch {
      setPosts([]);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const listBottomPadding = spacing.xxl + insets.bottom + 48;

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.unauthWrap}>
          <FeedHero />
          <EmptyStateView
            title="Требуется вход"
            subtitle="Авторизуйтесь, чтобы видеть обновления команды"
            style={styles.unauthEmpty}
          />
        </View>
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen>
        <FeedSkeleton />
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить ленту"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={() => {
            setLoading(true);
            load();
          }}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen scroll={false}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: listBottomPadding,
            flexGrow: posts.length === 0 ? 1 : undefined,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<FeedHero />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyStateView
              icon="newspaper-outline"
              title="Пока пусто"
              subtitle="В ленте ещё нет публикаций. Новости команды, анонсы тренера и фото появятся здесь."
              buttonLabel="Открыть команду"
              onButtonPress={() => router.push("/team/feed" as never)}
            />
          </View>
        }
        renderItem={({ item, index }) => (
          <FeedCard
            item={item}
            index={index}
            onPress={() => router.push(`/feed/${item.id}`)}
          />
        )}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  skeletonContent: {
    gap: spacing.xl,
  },
  skeletonHeader: {
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  skeletonCard: {
    borderRadius: radius.lg,
  },

  heroSection: {
    marginBottom: spacing.xxl,
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
  heroTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  unauthWrap: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  unauthEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  errorWrap: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },

  cardWrap: { marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  badgeText: {
    ...typography.captionSmall,
    fontWeight: "600",
    color: colors.accent,
  },
  date: { ...typography.caption, color: colors.textMuted },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  preview: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  thumb: {
    height: 140,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgMid,
  },
  author: { ...typography.caption, color: colors.textMuted },
});

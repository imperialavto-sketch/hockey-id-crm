import { useState, useCallback, useMemo, memo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import {
  getConversations,
  COACH_MARK_ID,
} from "@/services/chatService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView, EmptyStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { trackCoachMarkEvent } from "@/lib/coachMarkAnalytics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { ConversationItem } from "@/types/chat";

const PRESSED_OPACITY = 0.88;
const PRESSED_STYLE = { opacity: PRESSED_OPACITY } as const;

function formatTime(iso: string): string {
  if (!iso || iso.trim() === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const ChatListSkeleton = memo(function ChatListSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
    </View>
  );
});

export default function ChatTabScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    if (mountedRef.current) setLoadError(false);
    try {
      const data = await getConversations(user.id);
      if (!mountedRef.current) return;
      const coachMarkItem: ConversationItem = {
        id: COACH_MARK_ID,
        playerId: "",
        playerName: "Персональный AI-тренер",
        coachId: COACH_MARK_ID,
        coachName: "Coach Mark",
        parentId: user.id,
        lastMessage: undefined,
        updatedAt: new Date().toISOString(),
      };
      setConversations([coachMarkItem, ...data]);
    } catch {
      if (mountedRef.current) {
        setConversations([]);
        setLoadError(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) load();
    }, [load, user?.id])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const goToThread = useCallback(
    (item: ConversationItem) => {
      if (!item?.id) return;
      triggerHaptic();
      if (item.id === COACH_MARK_ID) {
        trackCoachMarkEvent("coachmark_chat_open_from_list");
      }
      router.push(`/chat/${item.id}`);
    },
    [router]
  );

  const handleRetry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  const listBottomPadding = spacing.xxl + insets.bottom + 60;

  const header = useMemo(
    () => (
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
        </View>
        <Text style={styles.heroTitle}>Чаты</Text>
        <Text style={styles.heroSub}>Coach Mark и диалоги с тренерами</Text>
      </View>
    ),
    [insets.top]
  );

  const keyExtractor = useCallback(
    (item: ConversationItem, index: number) => item?.id ?? `conv-${index}`,
    []
  );

  const contentContainerStyle = useMemo(
    () => [
      styles.list,
      conversations.length === 0 ? styles.emptyList : {},
      { paddingBottom: listBottomPadding },
    ],
    [conversations.length, listBottomPadding]
  );

  const listEmptyComponent = useMemo(
    () => (
      <EmptyStateView
        icon="chatbubbles-outline"
        title="Чатов пока нет"
        subtitle="Начните с Coach Mark — задайте вопрос о развитии, упражнениях или советах"
        style={styles.emptyWrap}
      />
    ),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ConversationItem; index: number }) => {
          const isCoachMark = item.id === COACH_MARK_ID;
          return (
            <Animated.View entering={screenReveal(STAGGER + index * 30)}>
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  isCoachMark && styles.rowCoachMark,
                  pressed && PRESSED_STYLE,
                ]}
                onPress={() => goToThread(item)}
              >
                <View style={[styles.avatarWrap, isCoachMark && styles.avatarCoachMark]}>
                  <Ionicons
                    name={isCoachMark ? "sparkles" : "person"}
                    size={24}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTitleRow}>
                    <Text style={[styles.coachName, isCoachMark && styles.coachNameCoachMark]}>
                      {item?.coachName ?? "—"}
                    </Text>
                    {isCoachMark && (
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerName}>
                    {isCoachMark ? "Персональный хоккейный тренер" : (item?.playerName ?? "—")}
                  </Text>
                  {item.lastMessage ? (
                    <Text style={styles.preview} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.time}>{formatTime(item?.updatedAt ?? "")}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            </Animated.View>
          );
    },
    [goToThread]
  );

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="chatbubbles-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Чаты</Text>
          <Text style={styles.heroSub}>Coach Mark и диалоги с тренерами</Text>
        </View>
        <EmptyStateView
          icon="person-outline"
          title="Требуется вход"
          subtitle="Авторизуйтесь, чтобы общаться с тренером"
          style={styles.emptyWrap}
        />
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <ChatListSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (loadError) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.errorWrap}>
          <ErrorStateView
            variant="network"
            title="Не получилось загрузить чаты"
            subtitle="Проверьте подключение и попробуйте снова"
            onAction={handleRetry}
          />
        </View>
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header} scroll={false}>
      <FlatList
        data={conversations}
        keyExtractor={keyExtractor}
        contentContainerStyle={contentContainerStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={listEmptyComponent}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLevel1Border,
  },
  heroSection: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
  },
  skeletonContent: { gap: spacing.lg },
  skeletonRow: { borderRadius: radius.lg },

  errorWrap: { flex: 1 },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  emptyList: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  rowCoachMark: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.22)",
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  avatarCoachMark: {
    backgroundColor: "rgba(59,130,246,0.22)",
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  coachName: {
    ...typography.cardTitle,
    fontSize: 17,
    color: colors.text,
  },
  coachNameCoachMark: {
    color: colors.accentBright,
  },
  aiBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentBright,
    letterSpacing: 0.5,
  },
  playerName: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  preview: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs + 2,
    lineHeight: 20,
  },
  time: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },

  emptyWrap: { flex: 1, justifyContent: "center" },
});

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
import { getConversations, COACH_MARK_ID } from "@/services/chatService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView, EmptyStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { trackCoachMarkEvent } from "@/lib/coachMarkAnalytics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { ConversationItem } from "@/types/chat";
import {
  CHAT_INBOX_COPY,
  formatConversationListTime,
  conversationPreviewLine,
  isCoachMarkInboxItem,
} from "@/lib/parentChatInboxUi";
import { PARENT_FLAGSHIP } from "@/lib/parentFlagshipShared";

const PRESSED_OPACITY = 0.88;
const PRESSED_STYLE = { opacity: PRESSED_OPACITY } as const;

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

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

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

  const handleRetry = useCallback(() => {
    setLoading(true);
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

  const listBottomPadding = spacing.xxl + insets.bottom + 60;

  const header = useMemo(
    () => (
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="chatbubbles-outline" size={26} color={colors.accent} />
        </View>
        <Text style={styles.heroTitle}>{CHAT_INBOX_COPY.heroTitle}</Text>
        <Text style={styles.heroSub}>{CHAT_INBOX_COPY.heroSub}</Text>
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
        title={CHAT_INBOX_COPY.emptyTitle}
        subtitle={CHAT_INBOX_COPY.emptySubtitle}
        style={styles.emptyWrap}
      />
    ),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ConversationItem; index: number }) => {
      const isCoachMark = isCoachMarkInboxItem(item);
      const timeStr = formatConversationListTime(item?.updatedAt ?? "");
      const preview = conversationPreviewLine(item, isCoachMark);
      const contextLine = isCoachMark
        ? CHAT_INBOX_COPY.coachMarkContextLine
        : item?.playerName ?? "—";

      return (
        <Animated.View entering={screenReveal(STAGGER + index * 30)}>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              isCoachMark ? styles.rowCoachMark : undefined,
              pressed ? PRESSED_STYLE : undefined,
            ]}
            onPress={() => goToThread(item)}
          >
            <View style={[styles.avatarWrap, isCoachMark ? styles.avatarCoachMark : undefined]}>
              <Ionicons
                name={isCoachMark ? "sparkles" : "person"}
                size={22}
                color={colors.accent}
              />
            </View>
            <View style={styles.rowContent}>
              <View style={styles.rowTopLine}>
                <View style={styles.rowTitleBlock}>
                  <View style={styles.rowTitleRow}>
                    <Text
                      style={[styles.coachName, isCoachMark ? styles.coachNameCoachMark : undefined]}
                      numberOfLines={1}
                    >
                      {item?.coachName ?? "—"}
                    </Text>
                    {isCoachMark ? (
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>AI</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.time}>{timeStr}</Text>
              </View>
              <Text style={styles.contextLine} numberOfLines={1}>
                {contextLine}
              </Text>
              <Text style={styles.preview} numberOfLines={2}>
                {preview}
              </Text>
            </View>
            <Ionicons
            name="chevron-forward"
            size={20}
            color={PARENT_FLAGSHIP.chevronMutedIcon}
          />
          </Pressable>
        </Animated.View>
      );
    },
    [goToThread]
  );

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false} safeAreaEdges={["top", "bottom"]}>
        <View style={styles.authGate}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="chatbubbles-outline" size={26} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>{CHAT_INBOX_COPY.heroTitle}</Text>
          <Text style={styles.heroSub}>{CHAT_INBOX_COPY.heroSub}</Text>
        </View>
        <EmptyStateView
          icon="person-outline"
          title={CHAT_INBOX_COPY.authTitle}
          subtitle={CHAT_INBOX_COPY.authSubtitle}
          style={styles.emptyWrap}
        />
      </FlagshipScreen>
    );
  }

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.paddedContent}>
          <Text style={styles.loadingHint}>{CHAT_INBOX_COPY.loadingHint}</Text>
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
            title={CHAT_INBOX_COPY.loadErrorTitle}
            subtitle={CHAT_INBOX_COPY.loadErrorSubtitle}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  authGate: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  heroSub: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    maxWidth: 320,
  },

  paddedContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  loadingHint: {
    ...typography.captionSmall,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    letterSpacing: 0.15,
  },
  skeletonContent: { gap: spacing.md },
  skeletonRow: { borderRadius: radius.lg },

  errorWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  emptyList: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel1Border,
  },
  rowCoachMark: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.22)",
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(59,130,246,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    alignSelf: "center",
  },
  avatarCoachMark: {
    backgroundColor: "rgba(59,130,246,0.18)",
    borderColor: "rgba(59,130,246,0.28)",
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rowTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "nowrap",
  },
  coachName: {
    ...typography.cardTitle,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },
  coachNameCoachMark: {
    color: colors.accentBright,
  },
  aiBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(59,130,246,0.22)",
    flexShrink: 0,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentBright,
    letterSpacing: 0.4,
  },
  contextLine: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  preview: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  time: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    flexShrink: 0,
    opacity: 0.92,
  },

  emptyWrap: { flex: 1, justifyContent: "center" },
});

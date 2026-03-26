import { useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getConversations } from "@/services/chatService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock, ErrorStateView, EmptyStateView } from "@/components/ui";
import { screenReveal, STAGGER } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { ConversationItem } from "@/types/chat";
import {
  CHAT_INBOX_COPY,
  formatConversationListTime,
  conversationPreviewLine,
} from "@/lib/parentChatInboxUi";
import { PARENT_FLAGSHIP } from "@/lib/parentFlagshipShared";

const PRESSED_OPACITY = 0.88;

const ChatListSkeleton = memo(function ChatListSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
      <SkeletonBlock height={88} style={styles.skeletonRow} />
    </View>
  );
});

export default function ChatListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(false);
    try {
      const data = await getConversations(user.id);
      setConversations(data);
    } catch {
      setConversations([]);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  const goToThread = useCallback(
    (item: ConversationItem) => {
      triggerHaptic();
      router.push(`/chat/${item.id}`);
    },
    [router]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const header = (
    <ScreenHeader
      title="Чат с тренером"
      subtitle="Диалоги с тренерами ваших игроков"
    />
  );

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false} safeAreaEdges={["top", "bottom"]}>
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

  const listBottomPadding = spacing.xxl + insets.bottom;

  return (
    <FlagshipScreen header={header} scroll={false}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          conversations.length === 0 ? styles.emptyList : {},
          { paddingBottom: listBottomPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <EmptyStateView
            icon="chatbubbles-outline"
            title={CHAT_INBOX_COPY.emptyTitle}
            subtitle={CHAT_INBOX_COPY.stackEmptySubtitle}
            style={styles.emptyWrap}
          />
        }
        renderItem={({ item, index }) => {
          const timeStr = formatConversationListTime(item.updatedAt);
          const preview = conversationPreviewLine(item, false);
          return (
            <Animated.View entering={screenReveal(STAGGER + index * 30)}>
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed ? { opacity: PRESSED_OPACITY } : undefined,
                ]}
                onPress={() => goToThread(item)}
              >
                <View style={styles.avatarWrap}>
                  <Ionicons name="person" size={22} color={colors.accent} />
                </View>
                <View style={styles.rowContent}>
                  <View style={styles.rowTopLine}>
                    <Text style={styles.coachName} numberOfLines={1}>
                      {item.coachName}
                    </Text>
                    <Text style={styles.time}>{timeStr}</Text>
                  </View>
                  <Text style={styles.contextLine} numberOfLines={1}>
                    {item.playerName}
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
        }}
        showsVerticalScrollIndicator={false}
      />
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
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
  emptyWrap: { flex: 1, justifyContent: "center" },
  list: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.sm },
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
  rowContent: { flex: 1, minWidth: 0 },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  coachName: {
    ...typography.cardTitle,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
    marginTop: 2,
    opacity: 0.92,
  },
});

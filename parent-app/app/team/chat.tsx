import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getTeamMessages, sendTeamMessage } from "@/services/teamService";
import { MOCK_TEAM_NAME } from "@/constants/mockTeamPosts";
import { TeamChatMessage } from "@/components/team/TeamChatMessage";
import { MessageInput } from "@/components/team/MessageInput";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ErrorStateView, EmptyStateView, SkeletonBlock } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { spacing, radius } from "@/constants/theme";
import type { TeamMessage } from "@/types/team";

const ChatSkeleton = memo(function ChatSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={56} style={styles.skeletonBubble} />
      <SkeletonBlock height={72} style={[styles.skeletonBubble, styles.skeletonBubbleRight]} />
      <SkeletonBlock height={48} style={styles.skeletonBubble} />
      <SkeletonBlock height={64} style={[styles.skeletonBubble, styles.skeletonBubbleRight]} />
      <SkeletonBlock height={52} style={styles.skeletonBubble} />
    </View>
  );
});

export default function TeamChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getTeamMessages(user?.id);
      setMessages(data);
    } catch {
      setMessages([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const sent = await sendTeamMessage(trimmed, user?.id);
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [user?.id]
  );

  const header = useMemo(
    () => (
      <ScreenHeader
        title={MOCK_TEAM_NAME}
        subtitle="Командный чат"
        onBack={() => {
          triggerHaptic();
          router.back();
        }}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: TeamMessage) => item.id, []);

  const listContentStyle = useMemo(
    () =>
      messages.length === 0
        ? [styles.listContentEmpty, { paddingBottom: insets.bottom + spacing.xxl }]
        : [styles.listContent, { paddingBottom: insets.bottom + 80 }],
    [messages.length, insets.bottom]
  );

  const listEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <EmptyStateView
          icon="chatbubbles-outline"
          title="Командный чат"
          subtitle="Напишите сообщение — оно появится здесь. Общайтесь с тренером и родителями команды."
        />
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: TeamMessage }) => (
      <TeamChatMessage message={item} isCurrentUser={item.authorId === "me"} />
    ),
    []
  );

  const handleScrollBeginDrag = useCallback(() => Keyboard.dismiss(), []);

  if (loading) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <View style={styles.chatArea}>
          <ChatSkeleton />
        </View>
      </FlagshipScreen>
    );
  }

  if (error) {
    return (
      <FlagshipScreen header={header} scroll={false}>
        <ErrorStateView
          variant="network"
          title="Не удалось загрузить сообщения"
          subtitle="Проверьте подключение и попробуйте снова"
          onAction={load}
          style={styles.errorWrap}
        />
      </FlagshipScreen>
    );
  }

  return (
    <FlagshipScreen header={header} scroll={false}>
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={handleScrollBeginDrag}
          ListEmptyComponent={listEmptyComponent}
          renderItem={renderItem}
        />
        <MessageInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  chatArea: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  errorWrap: { flex: 1 },
  skeletonContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  skeletonBubble: {
    borderRadius: radius.lg,
    maxWidth: "80%",
  },
  skeletonBubbleRight: {
    alignSelf: "flex-end",
  },
});

import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getTeamMessages, sendTeamMessage } from "@/services/teamService";
import { MOCK_TEAM_NAME } from "@/constants/mockTeamPosts";
import { TeamChatMessage } from "@/components/team/TeamChatMessage";
import { MessageInput } from "@/components/team/MessageInput";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { ErrorStateView, EmptyStateView, SkeletonBlock } from "@/components/ui";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { TeamMessage } from "@/types/team";

const PRESSED_OPACITY = 0.88;

function ChatSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={56} style={styles.skeletonBubble} />
      <SkeletonBlock height={72} style={[styles.skeletonBubble, styles.skeletonBubbleRight]} />
      <SkeletonBlock height={48} style={styles.skeletonBubble} />
      <SkeletonBlock height={64} style={[styles.skeletonBubble, styles.skeletonBubbleRight]} />
      <SkeletonBlock height={52} style={styles.skeletonBubble} />
    </View>
  );
}

export default function TeamChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const sent = await sendTeamMessage(trimmed, user?.id);
    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

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
        <Text style={styles.headerTitle}>{MOCK_TEAM_NAME}</Text>
        <Text style={styles.headerSubtitle}>Командный чат</Text>
      </View>
    </View>
  );

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
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            messages.length === 0 ? styles.listContentEmpty : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyStateView
                icon="chatbubbles-outline"
                title="Командный чат"
                subtitle="Напишите сообщение — оно появится здесь. Общайтесь с тренером и родителями команды."
              />
            </View>
          }
          renderItem={({ item }) => (
            <TeamChatMessage
              message={item}
              isCurrentUser={item.authorId === "me"}
            />
          )}
        />
        <MessageInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
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
  headerCenter: { flex: 1, marginLeft: spacing.sm },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  chatArea: { flex: 1 },
  listContent: {
    paddingVertical: spacing.xl,
    paddingBottom: spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
    paddingVertical: spacing.xl,
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
    height: 56,
    borderRadius: radius.lg,
    maxWidth: "80%",
  },
  skeletonBubbleRight: {
    alignSelf: "flex-end",
  },
});

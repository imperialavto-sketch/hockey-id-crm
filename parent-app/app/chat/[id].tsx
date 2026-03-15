import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getConversationMessages,
  sendMessage,
} from "@/services/chatService";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { ChatMessage } from "@/types/chat";

const PRESSED_OPACITY = 0.88;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatThreadSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={60} style={styles.skeletonBubble} />
      <SkeletonBlock height={80} style={[styles.skeletonBubble, { alignSelf: "flex-end" }]} />
      <SkeletonBlock height={50} style={styles.skeletonBubble} />
      <SkeletonBlock height={90} style={[styles.skeletonBubble, { alignSelf: "flex-end" }]} />
      <SkeletonBlock height={70} style={styles.skeletonBubble} />
    </View>
  );
}

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!id || typeof id !== "string" || !user?.id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getConversationMessages(id, user.id);
      setMessages(data);
    } catch {
      setMessages([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !id || typeof id !== "string" || !user?.id || sending) return;

    triggerHaptic();
    setSending(true);
    setInput("");
    const sent = await sendMessage(id, text, user.id);
    setSending(false);

    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      setInput(text);
      Alert.alert(
        "Не удалось отправить",
        "Попробуйте ещё раз. Проверьте подключение к интернету."
      );
    }
  };

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Требуется вход</Text>
          <Text style={styles.emptySub}>Авторизуйтесь для общения</Text>
        </View>
      </FlagshipScreen>
    );
  }

  const chatContent = (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <View style={styles.skeletonWrap}>
          <ChatThreadSkeleton />
        </View>
      ) : loadError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Не удалось загрузить сообщения</Text>
          <Text style={styles.errorSub}>
            Проверьте подключение и попробуйте снова
          </Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: PRESSED_OPACITY }]}
            onPress={() => {
              triggerHaptic();
              load();
            }}
          >
            <Text style={styles.retryBtnText}>Повторить</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            initialNumToRender={15}
            contentContainerStyle={
              messages.length === 0 ? styles.emptyList : styles.listContent
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="chatbubble-outline" size={40} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Сообщений пока нет</Text>
                <Text style={styles.emptySub}>Напишите первым</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isParent = item.senderType === "parent";
              return (
                <Animated.View entering={screenReveal(index * 20)}>
                  <View
                    style={[
                      styles.bubble,
                      isParent ? styles.bubbleRight : styles.bubbleLeft,
                    ]}
                  >
                    <Text style={styles.bubbleText}>{item.text}</Text>
                    <Text style={styles.bubbleTime}>
                      {formatTimestamp(item.createdAt)}
                    </Text>
                  </View>
                </Animated.View>
              );
            }}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Сообщение"
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (!input.trim() || sending) && styles.sendBtnDisabled,
                input.trim() && !sending && pressed && { opacity: PRESSED_OPACITY },
              ]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.bgDeep} />
              ) : (
                <Ionicons name="send" size={20} color={colors.bgDeep} />
              )}
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <FlagshipScreen scroll={false}>
      <View style={styles.wrap}>
        {chatContent}
      </View>
    </FlagshipScreen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  skeletonWrap: {
    flex: 1,
    padding: spacing.lg,
  },
  skeletonContent: {
    gap: spacing.lg,
  },
  skeletonBubble: {
    borderRadius: 18,
    maxWidth: "80%",
  },

  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  bubble: {
    maxWidth: "80%",
    padding: spacing.lg,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  bubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  bubbleTime: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.bgDeep,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingTop: spacing.md,
    ...typography.bodySmall,
    color: colors.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxxl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLevel2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  errorTitle: { ...typography.h2, color: colors.text, textAlign: "center" },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xxl,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 14,
  },
  retryBtnText: { fontSize: 16, fontWeight: "600", color: colors.onAccent },
});

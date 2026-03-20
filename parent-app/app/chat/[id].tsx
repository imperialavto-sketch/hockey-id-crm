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
  Keyboard,
  Platform,
} from "react-native";
import Animated from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getConversationMessages,
  sendMessage,
  COACH_MARK_ID,
  isCoachMarkConversation,
  getCoachMarkMessages,
  getCoachMarkConversation,
  saveCoachMarkMessages,
  sendMessageToCoachMark,
  generateWeeklyPlanWithCoachMark,
  type CoachMarkPlayerContext,
} from "@/services/chatService";
import { getPlayerContextForCoachMark } from "@/services/playerService";
import {
  saveCoachMarkNote,
  convertWeeklyPlanToCalendarItems,
  saveCoachMarkCalendarItems,
} from "@/services/coachMarkStorage";
import {
  saveCoachMarkMemory,
  getMemoryKeyLabel,
} from "@/services/coachMarkMemory";
import { FlagshipScreen } from "@/components/layout/FlagshipScreen";
import { SkeletonBlock } from "@/components/ui";
import { screenReveal } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { trackCoachMarkEvent } from "@/lib/coachMarkAnalytics";
import { ApiRequestError } from "@/lib/api";
import { colors, spacing, typography, radius } from "@/constants/theme";
import type { ChatMessage } from "@/types/chat";

const PRESSED_OPACITY = 0.88;

const COACH_MARK_STARTER_PROMPTS = [
  "Как улучшить бросок?",
  "Какие упражнения для катания?",
  "Как развивать хоккейное мышление?",
  "Советы по питанию юного хоккеиста",
];

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
  const { id, playerId, initialMessage } = useLocalSearchParams<{
    id: string;
    playerId?: string;
    initialMessage?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [playerContext, setPlayerContext] = useState<CoachMarkPlayerContext | null>(null);
  const [memories, setMemories] = useState<{ key: string; value: string }[]>([]);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [coachMarkLoadFailed, setCoachMarkLoadFailed] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (id && typeof id === "string") {
      const q = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
      navigation.setOptions({
        title: isCoachMarkConversation(id) ? "Coach Mark" : "Чат",
        headerRight: isCoachMarkConversation(id)
          ? () => (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push(`/coach-mark${q}`);
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Ionicons name="folder-open-outline" size={22} color="#ffffff" />
              </Pressable>
            )
          : undefined,
      });
    }
  }, [id, navigation, playerId]);

  useEffect(() => {
    if (
      id === COACH_MARK_ID &&
      typeof playerId === "string" &&
      playerId &&
      user?.id
    ) {
      getPlayerContextForCoachMark(playerId, user.id).then(setPlayerContext);
    } else {
      setPlayerContext(null);
    }
  }, [id, playerId, user?.id]);

  useEffect(() => {
    if (id === COACH_MARK_ID) {
      trackCoachMarkEvent("coachmark_chat_open");
    }
  }, [id]);

  useEffect(() => {
    if (id === COACH_MARK_ID && user?.id) {
      import("@/services/coachMarkMemory").then(({ getCoachMarkMemories }) =>
        getCoachMarkMemories(user.id, playerId ?? null).then((list) =>
          setMemories(list.map((m) => ({ key: m.key, value: m.value })))
        )
      );
    } else {
      setMemories([]);
    }
  }, [id, user?.id, playerId]);

  const saveMemory = useCallback(
    async (key: string, value: string) => {
      if (!user?.id) return;
      const saved = await saveCoachMarkMemory(
        user.id,
        { key, value },
        playerId ?? undefined
      );
      trackCoachMarkEvent("coachmark_memory_save", { memoryKey: key });
      setMemories((prev) => {
        if (key === "note") return [{ key: saved.key, value: saved.value }, ...prev];
        const rest = prev.filter((m) => m.key !== key);
        return [{ key: saved.key, value: saved.value }, ...rest];
      });
      Alert.alert("Готово", "Coach Mark запомнил. Это будет учитываться в следующих разговорах.");
    },
    [user?.id, playerId]
  );

  const load = useCallback(async () => {
    if (!id || typeof id !== "string" || !user?.id) return;
    setLoading(true);
    setLoadError(false);
    setCoachMarkLoadFailed(false);
    try {
      if (isCoachMarkConversation(id)) {
        const cached = await getCoachMarkMessages(user.id);
        if (cached.length > 0) {
          setMessages(cached);
          setLoading(false);
        }
        const backend = await getCoachMarkConversation(user.id);
        if (backend !== null) {
          setMessages(backend);
          void saveCoachMarkMessages(user.id, backend);
        } else if (cached.length === 0) {
          trackCoachMarkEvent("coachmark_chat_load_error");
          setMessages([]);
          setLoadError(false);
          setCoachMarkLoadFailed(true);
        }
      } else {
        const data = await getConversationMessages(id, user.id);
        setMessages(data);
      }
    } catch {
      const cached = isCoachMarkConversation(id)
        ? await getCoachMarkMessages(user.id)
        : [];
      if (cached.length > 0) {
        setMessages(cached);
      } else {
        if (isCoachMarkConversation(id)) {
          trackCoachMarkEvent("coachmark_chat_load_error");
          setMessages([]);
          setLoadError(false);
          setCoachMarkLoadFailed(true);
        } else {
          setMessages([]);
          setLoadError(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (__DEV__ && id && isCoachMarkConversation(id)) {
      console.log("[CoachMark] Chat screen ENTER", { id, playerId });
    }
    load();
  }, [load]);

  useEffect(() => {
    if (typeof initialMessage === "string" && initialMessage.trim()) {
      setInput(initialMessage.trim());
    }
  }, [initialMessage]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async (overrideText?: unknown) => {
    const rawText =
      typeof overrideText === "string"
        ? overrideText
        : typeof input === "string"
          ? input
          : "";
    const text = rawText.trim();
    if (!text || !id || typeof id !== "string" || !user?.id || sending) return;

    triggerHaptic();
    setSending(true);
    setSendError(null);
    setLastFailedText(null);
    setInput("");

    if (isCoachMarkConversation(id)) {
      trackCoachMarkEvent("coachmark_message_send");
      const userMsg: ChatMessage = {
        id: `parent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversationId: COACH_MARK_ID,
        senderType: "parent",
        senderId: user.id,
        text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [...prev, userMsg];
        void saveCoachMarkMessages(user.id, next);
        return next;
      });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

      const memForApi = memories.map((m) => ({
        key: m.key.startsWith("note_") ? "note" : m.key,
        value: m.value,
      }));
      let aiMsg;
      try {
        aiMsg = await sendMessageToCoachMark(
          text,
          user.id,
          [...messages, userMsg],
          playerContext,
          memForApi
        );
      } catch (err) {
        setSending(false);
        trackCoachMarkEvent("coachmark_message_error");
        setInput(text);
        setLastFailedText(text);
        const errMsg =
          err instanceof ApiRequestError && err.status === 503
            ? "AI-ассистент временно недоступен. Добавьте OPENAI_API_KEY в .env файл hockey-server."
            : "Не получилось связаться с Coach Mark. Попробуйте ещё раз.";
        setSendError(errMsg);
        return;
      }
      setSending(false);
      trackCoachMarkEvent("coachmark_message_success");
      setMessages((prev) => {
        const next = [...prev, aiMsg];
        void saveCoachMarkMessages(user.id, next);
        return next;
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      void (async () => {
        const backend = await getCoachMarkConversation(user.id);
        if (backend !== null && backend.length > 0) {
          setMessages(backend);
          void saveCoachMarkMessages(user.id, backend);
        }
      })();
      return;
    }

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
  }, [id, user?.id, sending, input, messages, memories, playerContext]);

  const handleRetrySend = () => {
    if (!lastFailedText?.trim() || sending) return;
    triggerHaptic();
    setSendError(null);
    setLastFailedText(null);
    void handleSend(lastFailedText.trim());
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

  const composerHeight = 72 + insets.bottom;
  const listContentBottom =
    messages.length === 0
      ? { ...styles.emptyList, paddingBottom: composerHeight + spacing.xl }
      : { ...styles.listContent, paddingBottom: composerHeight + spacing.xl };

  const chatContent = (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
    >
      {loading ? (
        <View style={styles.skeletonWrap}>
          <ChatThreadSkeleton />
        </View>
      ) : loadError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Не получилось загрузить чат</Text>
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
          <View style={styles.listArea}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              initialNumToRender={15}
              contentContainerStyle={listContentBottom}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={() => Keyboard.dismiss()}
              ListFooterComponent={
                sending && isCoachMarkConversation(id) ? (
                  <View style={[styles.bubble, styles.bubbleLeft, styles.bubbleCoachMark, styles.typingBubble]}>
                    <Text style={styles.typingText}>Coach Mark думает…</Text>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons
                      name={id === COACH_MARK_ID ? "sparkles-outline" : "chatbubble-outline"}
                      size={40}
                      color={colors.textMuted}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {id === COACH_MARK_ID ? "Привет! Я Coach Mark" : "Сообщений пока нет"}
                  </Text>
                  <Text style={styles.emptySub}>
                    {id === COACH_MARK_ID
                      ? "Ваш персональный хоккейный тренер. Спросите о развитии, упражнениях или советах — отвечу по делу."
                      : "Напишите первым"}
                  </Text>
                  {id === COACH_MARK_ID && (
                    <>
                    <View style={styles.starterPromptsWrap}>
                      {COACH_MARK_STARTER_PROMPTS.map((prompt, idx) => (
                        <Pressable
                          key={prompt}
                          style={({ pressed }) => [
                            styles.starterPromptChip,
                            pressed && { opacity: PRESSED_OPACITY },
                          ]}
                          onPress={() => {
                            triggerHaptic();
                            trackCoachMarkEvent("coachmark_starter_prompt_tap", { promptIndex: idx });
                            void handleSend(prompt);
                          }}
                        >
                          <Text style={styles.starterPromptText} numberOfLines={1}>
                            {prompt}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.memoryHint}>
                      Долгое нажатие на ответ — сохранить в память Coach Mark
                    </Text>
                    {coachMarkLoadFailed && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.retryBtn,
                          { marginTop: spacing.lg },
                          pressed && { opacity: PRESSED_OPACITY },
                        ]}
                        onPress={() => {
                          triggerHaptic();
                          load();
                        }}
                      >
                        <Text style={styles.retryBtnText}>Повторить загрузку</Text>
                      </Pressable>
                    )}
                    </>
                  )}
                  {id === COACH_MARK_ID && user?.id && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.planChip,
                        pressed && { opacity: PRESSED_OPACITY },
                      ]}
                      onPress={async () => {
                        if (planLoading || !user?.id) return;
                        triggerHaptic();
                        trackCoachMarkEvent("coachmark_weekly_plan_tap");
                        setPlanLoading(true);
                        const memForApi = memories.map((m) => ({
                          key: m.key.startsWith("note_") ? "note" : m.key,
                          value: m.value,
                        }));
                        const { chatMessage, savedPlan } =
                          await generateWeeklyPlanWithCoachMark(
                            user.id,
                            [],
                            playerContext,
                            memForApi
                          );
                        setPlanLoading(false);
                        if (chatMessage) {
                          setMessages((prev) => {
                            const next = [...prev, chatMessage];
                            void saveCoachMarkMessages(user.id, next);
                            return next;
                          });
                          setTimeout(
                            () => flatListRef.current?.scrollToEnd({ animated: true }),
                            100
                          );
                          void (async () => {
                            const backend = await getCoachMarkConversation(user.id);
                            if (backend !== null && backend.length > 0) {
                              setMessages(backend);
                              void saveCoachMarkMessages(user.id, backend);
                            }
                          })();
                          if (savedPlan) {
                            Alert.alert(
                              "План сохранён",
                              "Недельный план добавлен в заметки.",
                              [
                                { text: "OK", style: "default" },
                                {
                                  text: "Подготовить для календаря",
                                  onPress: async () => {
                                    if (!user?.id || !savedPlan) return;
                                    const items = convertWeeklyPlanToCalendarItems(savedPlan);
                                    await saveCoachMarkCalendarItems(
                                      user.id,
                                      items,
                                      playerId ?? savedPlan.playerId
                                    );
                                    Alert.alert(
                                      "Готово",
                                      "События подготовлены для календаря."
                                    );
                                  },
                                },
                              ]
                            );
                          }
                        }
                      }}
                      disabled={planLoading}
                    >
                      <Text style={styles.planChipText}>
                        {planLoading ? "Загрузка…" : "Получить недельный план"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              }
              renderItem={({ item, index }) => {
                const isParent = item.senderType === "parent";
                const isCoachMarkMsg = item.isAI || item.senderId === COACH_MARK_ID;
                const bubbleContent = (
                  <View
                    style={[
                      styles.bubble,
                      isParent ? styles.bubbleRight : styles.bubbleLeft,
                      isCoachMarkMsg && styles.bubbleCoachMark,
                    ]}
                  >
                    <Text style={styles.bubbleText}>{item.text}</Text>
                    <Text style={styles.bubbleTime}>
                      {formatTimestamp(item.createdAt)}
                    </Text>
                  </View>
                );
                return (
                  <Animated.View entering={screenReveal(index * 20)}>
                    {isCoachMarkMsg ? (
                      <Pressable
                        onLongPress={() => {
                          triggerHaptic();
                          Alert.alert(
                            "Сохранить ответ?",
                            "В заметки или в память Coach Mark. В память — он будет учитывать в следующих разговорах.",
                            [
                              { text: "Отмена", style: "cancel" },
                              {
                                text: "В заметки",
                                onPress: async () => {
                                  if (!user?.id) return;
                                  await saveCoachMarkNote(
                                    user.id,
                                    item.text,
                                    playerId ?? undefined
                                  );
                                  Alert.alert("Сохранено", "Заметка добавлена.");
                                },
                              },
                              {
                                text: "В память",
                                onPress: () => {
                                  if (!user?.id) return;
                                  Alert.alert(
                                    "Выберите категорию",
                                    "Как Coach Mark должен запомнить этот факт?",
                                    [
                                      { text: "Отмена", style: "cancel" },
                                      {
                                        text: getMemoryKeyLabel("preferredFocus"),
                                        onPress: () =>
                                          saveMemory("preferredFocus", item.text),
                                      },
                                      {
                                        text: getMemoryKeyLabel("parentConcern"),
                                        onPress: () =>
                                          saveMemory("parentConcern", item.text),
                                      },
                                      {
                                        text: getMemoryKeyLabel("trainingGoal"),
                                        onPress: () =>
                                          saveMemory("trainingGoal", item.text),
                                      },
                                      {
                                        text: getMemoryKeyLabel("usualScheduleNote"),
                                        onPress: () =>
                                          saveMemory("usualScheduleNote", item.text),
                                      },
                                      {
                                        text: getMemoryKeyLabel("note"),
                                        onPress: () => saveMemory("note", item.text),
                                      },
                                    ]
                                  );
                                },
                              },
                            ]
                          );
                        }}
                        delayLongPress={400}
                      >
                        {bubbleContent}
                      </Pressable>
                    ) : (
                      bubbleContent
                    )}
                  </Animated.View>
                );
              }}
            />
          </View>
          {sendError && isCoachMarkConversation(id) && (
            <View style={styles.inlineErrorRow}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
              <Text style={styles.inlineErrorText}>{sendError}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.inlineRetryBtn,
                  pressed && { opacity: PRESSED_OPACITY },
                ]}
                onPress={handleRetrySend}
              >
                <Text style={styles.inlineRetryBtnText}>Повторить</Text>
              </Pressable>
            </View>
          )}
          <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.lg }]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={
                isCoachMarkConversation(id)
                  ? "Спросите о развитии, упражнениях или советах"
                  : "Сообщение"
              }
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
                !input.trim() && !sending && styles.sendBtnDisabled,
                input.trim() && !sending && pressed && { opacity: PRESSED_OPACITY },
              ]}
              onPress={() => handleSend()}
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={input.trim() && !sending ? colors.onAccent : colors.textMuted}
                />
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

  listArea: {
    flex: 1,
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
  typingBubble: {
    opacity: 0.95,
    borderColor: "rgba(59,130,246,0.2)",
  },
  typingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  bubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderBottomLeftRadius: 4,
  },
  bubbleCoachMark: {
    borderLeftColor: "rgba(59,130,246,0.5)",
    borderLeftWidth: 2,
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
    lineHeight: 22,
  },
  bubbleTime: {
    ...typography.captionSmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.bgDeep,
  },
  input: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.md,
    minHeight: 44,
    ...typography.bodySmall,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceLevel2,
    borderColor: colors.surfaceLevel1Border,
    opacity: 0.7,
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
  planChip: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  planChipText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: "600",
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

  inlineErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceLevel2,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLevel1Border,
  },
  inlineErrorText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  inlineRetryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  inlineRetryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onAccent,
  },

  starterPromptsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  starterPromptChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  memoryHint: {
    ...typography.captionSmall,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  starterPromptText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    maxWidth: 200,
  },
});

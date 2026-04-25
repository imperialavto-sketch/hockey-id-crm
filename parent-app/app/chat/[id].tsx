import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  getConversationMessages,
  sendMessage,
  ARENA_COMPANION_CHAT_ID,
  isArenaCompanionConversation,
  getCoachMarkMessages,
  getCoachMarkConversation,
  saveCoachMarkMessages,
  sendMessageToCoachMark,
  generateWeeklyPlanWithCoachMark,
  type ArenaParentPlayerContext,
} from "@/services/chatService";
import { getPlayerContextForArena } from "@/services/playerService";
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
import { SkeletonBlock, ErrorStateView, PrimaryButton, GhostButton, PressableScale } from "@/components/ui";
import { screenReveal } from "@/lib/animations";
import { triggerHaptic } from "@/lib/haptics";
import { trackCoachMarkEvent } from "@/lib/coachMarkAnalytics";
import { ApiRequestError } from "@/lib/api";
import { colors, spacing, typography, radius, radii, inputStyles } from "@/constants/theme";
import { PARENT_FLAGSHIP } from "@/lib/parentFlagshipShared";
import type { ChatMessage } from "@/types/chat";

/** Props for ChatMessageBubble. Kept inline for co-location; extract if reused. */
type ChatMessageBubbleProps = {
  item: ChatMessage;
  index: number;
  onSaveNote: (text: string) => void;
  onSaveMemory: (key: string, value: string) => void;
};

/** Props for ChatListEmpty. */
type ChatListEmptyProps = {
  isArenaCompanionThread: boolean;
  userId: string | undefined;
  onStarterPrompt: (text: string) => void;
  onRetry: () => void;
  onPlanChip: () => void;
  planLoading: boolean;
  arenaCompanionLoadFailed: boolean;
};

const PRESSED_OPACITY = 0.88;
const PRESSED_STYLE = { opacity: PRESSED_OPACITY } as const;
const HEADER_PRESSED_STYLE = { opacity: 0.7 } as const;
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;
const BUBBLE_TAIL_RADIUS = radii.xs;
const TYPING_DOT_DURATION = 180;
const TYPING_DOT_INTERVAL = 380;
const TYPING_BREATHE_DURATION = 800;
const EMPTY_STATE_ICON_SIZE = 36;

const ARENA_COMPANION_STARTER_PROMPTS = [
  "Что делать на этой неделе для развития?",
  "Как улучшить бросок ребёнка?",
  "Составь план тренировок на неделю",
  "Что делать перед важной игрой?",
];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Strip raw markdown syntax for plain-text display (e.g. **bold** → bold) */
function stripMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ChatThreadSkeleton = memo(function ChatThreadSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <SkeletonBlock height={60} style={styles.skeletonBubble} />
      <SkeletonBlock height={80} style={[styles.skeletonBubble, styles.skeletonBubbleRight]} />
      <SkeletonBlock height={50} style={styles.skeletonBubble} />
      <SkeletonBlock height={90} style={[styles.skeletonBubble, styles.skeletonBubbleRight]} />
      <SkeletonBlock height={70} style={styles.skeletonBubble} />
    </View>
  );
});

/** Memoized message bubble for FlatList. Keeps long-press/save logic, avoids inline render path. */
const ChatMessageBubble = memo(function ChatMessageBubble({
  item,
  index,
  onSaveNote,
  onSaveMemory,
}: ChatMessageBubbleProps) {
  const isParent = item.senderType === "parent";
  const isArenaCompanionMsg = item.isAI || item.senderId === ARENA_COMPANION_CHAT_ID;

  const bubbleContent = (
    <View
      style={[
        styles.bubble,
        isParent ? styles.bubbleRight : styles.bubbleLeft,
        isArenaCompanionMsg && styles.bubbleCoachMark,
      ]}
    >
      <Text
        style={[styles.bubbleText, isArenaCompanionMsg && styles.bubbleTextCoachMark]}
      >
        {stripMarkdown(item.text)}
      </Text>
      <Text style={styles.bubbleTime}>{formatTimestamp(item.createdAt)}</Text>
    </View>
  );

  const handleLongPress = useCallback(() => {
    triggerHaptic();
    Alert.alert(
      "Сохранить ответ?",
      "В заметки или в память Арены. В память — учтём в следующих разговорах.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "В заметки",
          onPress: () => onSaveNote(item.text),
        },
        {
          text: "В память",
          onPress: () => {
            Alert.alert(
              "Выберите категорию",
              "Как запомнить этот факт?",
              [
                { text: "Отмена", style: "cancel" },
                {
                  text: getMemoryKeyLabel("preferredFocus"),
                  onPress: () => onSaveMemory("preferredFocus", item.text),
                },
                {
                  text: getMemoryKeyLabel("parentConcern"),
                  onPress: () => onSaveMemory("parentConcern", item.text),
                },
                {
                  text: getMemoryKeyLabel("trainingGoal"),
                  onPress: () => onSaveMemory("trainingGoal", item.text),
                },
                {
                  text: getMemoryKeyLabel("usualScheduleNote"),
                  onPress: () => onSaveMemory("usualScheduleNote", item.text),
                },
                {
                  text: getMemoryKeyLabel("note"),
                  onPress: () => onSaveMemory("note", item.text),
                },
              ]
            );
          },
        },
      ]
    );
  }, [item.text, onSaveNote, onSaveMemory]);

  const entering = isArenaCompanionMsg
    ? FadeInUp.duration(200).springify().damping(20)
    : screenReveal(index * 12);
  return (
    <Animated.View entering={entering}>
      {isArenaCompanionMsg ? (
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={400}
          style={({ pressed }) => pressed && styles.bubblePressed}
        >
          {bubbleContent}
        </Pressable>
      ) : (
        bubbleContent
      )}
    </Animated.View>
  );
});

/** Memoized empty state for FlatList. Reduces inline JSX in main render path. */
const ChatListEmpty = memo(function ChatListEmpty({
  isArenaCompanionThread,
  userId,
  onStarterPrompt,
  onRetry,
  onPlanChip,
  planLoading,
  arenaCompanionLoadFailed,
}: ChatListEmptyProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(380).springify().damping(20)}
      style={styles.emptyContainer}
    >
      <View style={styles.emptyIconWrap}>
        <Ionicons
          name={isArenaCompanionThread ? "sparkles-outline" : "chatbubble-outline"}
          size={EMPTY_STATE_ICON_SIZE}
          color={isArenaCompanionThread ? colors.accent : colors.textMuted}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {isArenaCompanionThread
          ? "AI-компаньон Арена"
          : "Пока нет сообщений"}
      </Text>
      <Text style={styles.emptySub}>
        {isArenaCompanionThread
          ? "Техника, мотивация и планы на неделю. Заглядывайте сюда регулярно — продолжим с учётом прогресса."
          : "Напишите первое сообщение — ответ появится здесь."}
      </Text>
      {isArenaCompanionThread && (
        <>
          <View style={styles.starterPromptsWrap}>
            {ARENA_COMPANION_STARTER_PROMPTS.map((prompt, idx) => (
              <Pressable
                key={prompt}
                style={({ pressed }) => [
                  styles.starterPromptChip,
                  pressed && PRESSED_STYLE,
                ]}
                onPress={() => {
                  triggerHaptic();
                  trackCoachMarkEvent("coachmark_starter_prompt_tap", {
                    promptIndex: idx,
                  });
                  void onStarterPrompt(prompt);
                }}
              >
                <Text style={styles.starterPromptText} numberOfLines={1}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.memoryHint}>
            Долгое нажатие на ответ — в заметки или в память Арены для следующих диалогов
          </Text>
          {arenaCompanionLoadFailed && (
            <View style={styles.retryWrap}>
              <PrimaryButton
                label="Повторить загрузку"
                onPress={onRetry}
              />
            </View>
          )}
        </>
      )}
      {isArenaCompanionThread && userId && (
        <Pressable
          style={({ pressed }) => [
            styles.planChip,
            pressed && !planLoading && PRESSED_STYLE,
            planLoading && styles.planChipDisabled,
          ]}
          onPress={onPlanChip}
          disabled={planLoading}
        >
          <Text style={styles.planChipText}>
            {planLoading ? "Загрузка…" : "План на эту неделю"}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  const active = useSharedValue(0);
  const breathe = useSharedValue(1);
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: TYPING_BREATHE_DURATION }),
        withTiming(1, { duration: TYPING_BREATHE_DURATION })
      ),
      -1,
      true
    );
  }, [breathe]);
  useEffect(() => {
    let next = 0;
    const t = setInterval(() => {
      next = (next + 1) % 3;
      active.value = withTiming(next, { duration: TYPING_DOT_DURATION });
    }, TYPING_DOT_INTERVAL);
    return () => clearInterval(t);
  }, [active]);
  const dot0Style = useAnimatedStyle(() => ({
    opacity: interpolate(active.value, [-0.5, 0, 0.5], [0.45, 1, 0.45]),
  }));
  const dot1Style = useAnimatedStyle(() => ({
    opacity: interpolate(active.value, [0.5, 1, 1.5], [0.45, 1, 0.45]),
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: interpolate(active.value, [1.5, 2, 2.5], [0.45, 1, 0.45]),
  }));
  const containerStyle = useAnimatedStyle(() => ({ opacity: breathe.value }));
  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify().damping(22)}
      style={[styles.bubble, styles.bubbleLeft, styles.bubbleCoachMark, styles.typingBubble]}
    >
      <Animated.View style={[styles.typingInner, containerStyle]}>
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>Арена думает</Text>
          <View style={styles.typingDots}>
            <Animated.Text style={[styles.typingDot, dot0Style]}>.</Animated.Text>
            <Animated.Text style={[styles.typingDot, dot1Style]}>.</Animated.Text>
            <Animated.Text style={[styles.typingDot, dot2Style]}>.</Animated.Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

export default function ChatConversationScreen() {
  const { id, playerId, initialMessage } = useLocalSearchParams<{
    id: string;
    playerId?: string;
    initialMessage?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [playerContext, setPlayerContext] = useState<ArenaParentPlayerContext | null>(null);
  const [memories, setMemories] = useState<{ key: string; value: string }[]>([]);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [arenaCompanionLoadFailed, setArenaCompanionLoadFailed] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const headerHeight = useHeaderHeight();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleHeaderFolderPress = useCallback(() => {
    triggerHaptic();
    const q = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
    router.push(`/coach-mark${q}` as Parameters<typeof router.push>[0]);
  }, [playerId, router]);

  const isArenaCompanionConversationId = useMemo(
    () => (id && typeof id === "string" ? isArenaCompanionConversation(id) : false),
    [id]
  );

  useEffect(() => {
    if (id && typeof id === "string") {
      navigation.setOptions({
        title: isArenaCompanionConversationId ? "Арена" : "Чат",
        headerRight: isArenaCompanionConversationId
          ? () => (
              <Pressable
                onPress={handleHeaderFolderPress}
                hitSlop={HIT_SLOP}
                style={({ pressed }) => [
                  styles.headerActionBtn,
                  pressed && HEADER_PRESSED_STYLE,
                ]}
              >
                <Ionicons name="folder-open-outline" size={20} color="#ffffff" />
              </Pressable>
            )
          : undefined,
      });
    }
  }, [id, navigation, playerId, handleHeaderFolderPress, isArenaCompanionConversationId]);

  useEffect(() => {
    if (
      id === ARENA_COMPANION_CHAT_ID &&
      typeof playerId === "string" &&
      playerId &&
      user?.id
    ) {
      getPlayerContextForArena(playerId, user.id).then(setPlayerContext);
    } else {
      setPlayerContext(null);
    }
  }, [id, playerId, user?.id]);

  useEffect(() => {
    if (id === ARENA_COMPANION_CHAT_ID) {
      trackCoachMarkEvent("coachmark_chat_open");
    }
  }, [id]);

  useEffect(() => {
    if (id === ARENA_COMPANION_CHAT_ID && user?.id) {
      import("@/services/coachMarkMemory").then(({ getCoachMarkMemories }) =>
        getCoachMarkMemories(user.id, playerId ?? null).then((list) =>
          setMemories(list.map((m) => ({ key: m.key, value: m.value })))
        )
      );
    } else {
      setMemories([]);
    }
  }, [id, user?.id, playerId]);

  const handleSaveNote = useCallback(
    async (text: string) => {
      if (!user?.id) return;
      await saveCoachMarkNote(user.id, text, playerId ?? undefined);
      Alert.alert("Сохранено", "Заметка добавлена.");
    },
    [user?.id, playerId]
  );

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
      Alert.alert("Готово", "Арена запомнила. Это будет учитываться в следующих разговорах.");
    },
    [user?.id, playerId]
  );

  const load = useCallback(async () => {
    if (!id || typeof id !== "string" || !user?.id) return;
    setLoading(true);
    setLoadError(false);
    setArenaCompanionLoadFailed(false);
    try {
      if (isArenaCompanionConversation(id)) {
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
          setArenaCompanionLoadFailed(true);
        }
      } else {
        const data = await getConversationMessages(id, user.id);
        setMessages(data);
      }
    } catch {
      const cached = isArenaCompanionConversation(id)
        ? await getCoachMarkMessages(user.id)
        : [];
      if (cached.length > 0) {
        setMessages(cached);
      } else {
        if (isArenaCompanionConversation(id)) {
          trackCoachMarkEvent("coachmark_chat_load_error");
          setMessages([]);
          setLoadError(false);
          setArenaCompanionLoadFailed(true);
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
    load();
  }, [load]);

  useEffect(() => {
    if (typeof initialMessage === "string" && initialMessage.trim()) {
      setInput(initialMessage.trim());
    }
  }, [initialMessage]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length, scrollToEnd]);

  useEffect(() => {
    if (keyboardVisible && messages.length > 0) {
      const t = setTimeout(scrollToEnd, 100);
      return () => clearTimeout(t);
    }
  }, [keyboardVisible, messages.length, scrollToEnd]);

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

    if (isArenaCompanionConversation(id)) {
      trackCoachMarkEvent("coachmark_message_send");
      const userMsg: ChatMessage = {
        id: `parent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversationId: ARENA_COMPANION_CHAT_ID,
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
        scrollToEnd();

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
            ? "AI-компаньон Арена временно недоступен. На стороне backend нужен OPENAI_API_KEY в окружении процесса, который обслуживает /api/chat/ai (обычно Next CRM)."
            : "Не получилось связаться с Ареной. Попробуйте ещё раз.";
        setSendError(errMsg);
        return;
      }
      setSending(false);
      trackCoachMarkEvent("coachmark_message_success");
      if (aiMsg) {
        setMessages((prev) => {
          const next: ChatMessage[] = [...prev, aiMsg];
          void saveCoachMarkMessages(user.id, next);
          return next;
        });
      }
      scrollToEnd();
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
      scrollToEnd();
    } else {
      setInput(text);
      Alert.alert(
        "Не удалось отправить",
        "Попробуйте ещё раз. Проверьте подключение к интернету."
      );
    }
  }, [id, user?.id, sending, input, messages, memories, playerContext, scrollToEnd]);

  const handleRetrySend = useCallback(() => {
    if (!lastFailedText?.trim() || sending) return;
    triggerHaptic();
    setSendError(null);
    setLastFailedText(null);
    void handleSend(lastFailedText.trim());
  }, [lastFailedText, sending, handleSend]);

  const handleRetryWithHaptic = useCallback(() => {
    triggerHaptic();
    load();
  }, [load]);

  const handlePlanChip = useCallback(async () => {
    if (planLoading || !user?.id) return;
    triggerHaptic();
    trackCoachMarkEvent("coachmark_weekly_plan_tap");
    setPlanLoading(true);
    const memForApi = memories.map((m) => ({
      key: m.key.startsWith("note_") ? "note" : m.key,
      value: m.value,
    }));
    const { chatMessage, savedPlan } = await generateWeeklyPlanWithCoachMark(
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
      scrollToEnd();
      void (async () => {
        const backend = await getCoachMarkConversation(user.id);
        if (backend !== null && backend.length > 0) {
          setMessages(backend);
          void saveCoachMarkMessages(user.id, backend);
        }
      })();
    }
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
              Alert.alert("Готово", "События подготовлены для календаря.");
            },
          },
        ]
      );
    }
  }, [
    planLoading,
    user?.id,
    memories,
    playerContext,
    playerId,
    scrollToEnd,
  ]);

  if (!user?.id) {
    return (
      <FlagshipScreen scroll={false} safeAreaEdges={["top", "bottom"]}>
        <View style={styles.authGate}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="person-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Нужен вход</Text>
          <Text style={styles.emptySub}>
            Авторизуйтесь, чтобы писать в чат и видеть ответы тренера
          </Text>
        </View>
      </FlagshipScreen>
    );
  }

  const isArenaCompanionThread = isArenaCompanionConversationId;
  const composerBottomPadding = keyboardVisible ? spacing.lg : insets.bottom + spacing.lg;
  const composerHeight = 72 + composerBottomPadding;
  const listContentBottom = useMemo(
    () =>
      messages.length === 0
        ? { ...styles.emptyList, paddingBottom: composerHeight + spacing.xl }
        : { ...styles.listContent, paddingBottom: composerHeight + spacing.xl },
    [messages.length, composerHeight]
  );

  const inputRowStyle = useMemo(
    () => [
      styles.inputRow,
      { paddingBottom: composerBottomPadding },
      sending ? styles.inputRowSending : undefined,
    ],
    [composerBottomPadding, sending]
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);
  const handleScrollBeginDrag = useCallback(() => Keyboard.dismiss(), []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <ChatMessageBubble
        item={item}
        index={index}
        onSaveNote={handleSaveNote}
        onSaveMemory={saveMemory}
      />
    ),
    [handleSaveNote, saveMemory]
  );

  const listFooterComponent = useMemo(
    () => (sending && isArenaCompanionThread ? <TypingIndicator /> : null),
    [sending, isArenaCompanionThread]
  );

  const listEmptyComponent = useMemo(
    () => (
      <ChatListEmpty
        isArenaCompanionThread={isArenaCompanionThread}
        userId={user?.id}
        onStarterPrompt={handleSend}
        onRetry={handleRetryWithHaptic}
        onPlanChip={handlePlanChip}
        planLoading={planLoading}
        arenaCompanionLoadFailed={arenaCompanionLoadFailed}
      />
    ),
    [
      isArenaCompanionThread,
      user?.id,
      handleSend,
      handleRetryWithHaptic,
      handlePlanChip,
      planLoading,
      arenaCompanionLoadFailed,
    ]
  );

  const chatContent = (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? (headerHeight ?? insets.top + 44) : 0}
    >
      {loading ? (
        <View style={styles.skeletonWrap}>
          <Text style={styles.skeletonHint}>Загружаем диалог…</Text>
          <ChatThreadSkeleton />
        </View>
      ) : loadError ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.errorWrap}>
          <ErrorStateView
            variant="network"
            title="Чат не загрузился"
            subtitle={PARENT_FLAGSHIP.networkRetrySubtitle}
            onAction={load}
          />
        </Animated.View>
      ) : (
        <>
          <View style={styles.listArea}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={keyExtractor}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={15}
              updateCellsBatchingPeriod={100}
              contentContainerStyle={listContentBottom}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              removeClippedSubviews={false}
              onScrollBeginDrag={handleScrollBeginDrag}
              ListFooterComponent={listFooterComponent}
              ListEmptyComponent={listEmptyComponent}
              renderItem={renderItem}
            />
          </View>
          {sendError && isArenaCompanionThread && (
            <Animated.View entering={FadeIn.duration(250)} style={styles.inlineErrorRow}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.inlineErrorText}>{sendError}</Text>
              <View style={styles.inlineErrorRetryWrap}>
                <GhostButton label="Повторить" onPress={handleRetrySend} />
              </View>
            </Animated.View>
          )}
          <View style={inputRowStyle}>
            <TextInput
              ref={inputRef}
              onFocus={scrollToEnd}
              style={[styles.input, sending && styles.inputDisabled]}
              placeholder={
                isArenaCompanionThread
                  ? "Спросите о технике, мотивации или плане на неделю"
                  : "Сообщение"
              }
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              editable={!sending}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => input.trim() && !sending && handleSend()}
            />
            <View
              accessibilityRole="button"
              accessibilityLabel={sending ? "Отправка…" : "Отправить"}
              accessibilityState={{ disabled: !input.trim() || sending }}
            >
              <PressableScale
                onPress={handleSend}
                disabled={!input.trim() || sending}
                scale={0.96}
                style={[
                  styles.sendBtn,
                  !input.trim() || sending ? styles.sendBtnDisabled : undefined,
                  sending ? styles.sendBtnSending : undefined,
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.onAccent} />
                ) : (
                  <Ionicons
                    name="send"
                    size={22}
                    color={input.trim() && !sending ? colors.onAccent : colors.textMuted}
                  />
                )}
              </PressableScale>
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <FlagshipScreen scroll={false} safeAreaEdges={["top", "bottom"]}>
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
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  flex: {
    flex: 1,
  },
  authGate: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  skeletonWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  skeletonHint: {
    ...typography.captionSmall,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    letterSpacing: 0.15,
  },
  skeletonContent: {
    gap: spacing.lg,
  },
  skeletonBubble: {
    borderRadius: radius.lg,
    maxWidth: "80%",
  },
  skeletonBubbleRight: {
    alignSelf: "flex-end" as const,
  },

  listArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  bubblePressed: {
    opacity: PRESSED_OPACITY,
  },
  typingBubble: {
    borderLeftColor: "rgba(59,130,246,0.35)",
    borderLeftWidth: 3,
  },
  typingInner: {
    flex: 1,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  typingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  typingDots: {
    flexDirection: "row",
    gap: spacing.xs / 2,
  },
  typingDot: {
    fontSize: 16,
    color: colors.accent,
  },
  bubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceLevel1,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
    borderBottomLeftRadius: BUBBLE_TAIL_RADIUS,
  },
  bubbleCoachMark: {
    backgroundColor: colors.surfaceLightAlt,
    borderLeftColor: "rgba(59,130,246,0.5)",
    borderLeftWidth: 3,
  },
  bubbleTextCoachMark: {
    lineHeight: 24.5,
  },
  bubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(59,130,246,0.22)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.28)",
    borderBottomRightRadius: BUBBLE_TAIL_RADIUS,
  },
  bubbleText: {
    ...typography.bodySmall,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  bubbleTime: {
    ...typography.captionSmall,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs + 2,
    opacity: 0.92,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: colors.surfaceLevel1,
  },
  inputRowSending: {
    opacity: 0.92,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLevel2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    paddingTop: 14,
    minHeight: 50,
    fontSize: inputStyles.fontSize,
    lineHeight: 23,
    color: colors.textPrimary,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  sendBtn: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceLevel2,
    opacity: 0.5,
  },
  sendBtnSending: {
    opacity: 0.88,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceLevel2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.section,
    fontSize: 19,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typography.bodySmall,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 280,
  },
  planChip: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  planChipText: {
    ...typography.bodySmall,
    fontSize: 15,
    color: colors.accent,
    fontWeight: "600",
  },
  planChipDisabled: {
    opacity: 0.6,
  },

  errorWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  retryWrap: {
    marginTop: spacing.xl,
  },

  inlineErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceLevel2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  inlineErrorRetryWrap: {
    flexShrink: 0,
  },
  inlineErrorText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  starterPromptsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  starterPromptChip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surfaceLevel1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceLevel1Border,
  },
  memoryHint: {
    ...typography.captionSmall,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    lineHeight: 16,
  },
  starterPromptText: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    maxWidth: 200,
  },
});

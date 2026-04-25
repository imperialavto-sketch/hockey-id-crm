import { memo, useCallback } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import Animated, { Easing, FadeInUp } from "react-native-reanimated";
import { COACH_MARK_ID } from "@/services/chatService";
import { getMemoryKeyLabel } from "@/services/coachMarkMemory";
import { triggerHaptic } from "@/lib/haptics";
import type { ChatMessage } from "@/types/chat";
import { chatThreadBubbleStyles as styles } from "@/lib/chatThreadBubbleStyles";
import {
  postMessageReport,
  postPeerBlock,
} from "@/services/parentModerationService";
import { showMessengerToast } from "@/lib/messengerToast";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Убрать markdown для отображения в пузыре (например **жирный** → жирный). */
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

/**
 * Пузырь сообщения в треде родителя (тренер / родитель / Арена).
 * Storybook: `ChatMessageBubble.stories.tsx`; снапшоты: `__tests__/messaging`.
 */
export type ChatMessageBubbleProps = {
  item: ChatMessage;
  index: number;
  onSaveNote: (text: string) => void;
  onSaveMemory: (key: string, value: string) => void;
  /** Для parent_parent / team_parent: свои пузыри справа, другие родители слева. */
  peerParentLayout?: boolean;
  viewerParentId?: string | null;
  announcementVisual?: boolean;
  messengerModeration?: {
    viewerParentId: string;
    teamId: string | null;
    enabled: boolean;
  };
  /** Только `team_parent_channel`: локально скрыть сообщения отправителя. */
  onLocalMuteSender?: (senderId: string) => void;
};

export const ChatMessageBubble = memo(function ChatMessageBubble({
  item,
  index,
  onSaveNote,
  onSaveMemory,
  peerParentLayout = false,
  viewerParentId = null,
  announcementVisual = false,
  messengerModeration,
  onLocalMuteSender,
}: ChatMessageBubbleProps) {
  const alignRight = peerParentLayout && viewerParentId
    ? item.senderType === "parent" && item.senderId === viewerParentId
    : item.senderType === "parent";
  const isCoachMarkMsg = item.isAI || item.senderId === COACH_MARK_ID;
  const useAnnouncementCard =
    announcementVisual &&
    !isCoachMarkMsg &&
    !(item.senderType === "parent" && item.senderId === viewerParentId);

  const bubbleContent = (
    <View
      style={[
        styles.bubble,
        useAnnouncementCard ? styles.bubbleAnnouncement : undefined,
        !useAnnouncementCard && (alignRight ? styles.bubbleRight : styles.bubbleLeft),
        isCoachMarkMsg && styles.bubbleCoachMark,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          isCoachMarkMsg && styles.bubbleTextCoachMark,
          useAnnouncementCard && styles.bubbleAnnouncementText,
        ]}
        accessibilityRole="text"
      >
        {stripMarkdown(item.text)}
      </Text>
      <Text
        style={[
          styles.bubbleTime,
          alignRight ? styles.bubbleTimeRight : styles.bubbleTimeLeft,
        ]}
        accessibilityLabel={`Время ${formatTimestamp(item.createdAt)}`}
      >
        {formatTimestamp(item.createdAt)}
      </Text>
    </View>
  );

  const handleLongPress = useCallback(() => {
    triggerHaptic();
    Alert.alert(
      "Сохранить ответ?",
      "В заметки или в память Арены. В память — это будет учитываться в следующих разговорах.",
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
              "В какой категории сохранить для Арены?",
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

  const handleMessengerLongPress = useCallback(() => {
    const mod = messengerModeration;
    if (!mod?.enabled || !mod.viewerParentId) return;
    if (item.senderId === mod.viewerParentId) return;
    triggerHaptic();
    const canBlock =
      !!mod.teamId &&
      item.senderType === "parent" &&
      item.senderId !== mod.viewerParentId;
    const buttons: {
      text: string;
      style?: "cancel" | "destructive" | "default";
      onPress?: () => void;
    }[] = [];
    if (
      onLocalMuteSender &&
      item.senderType === "parent" &&
      item.senderId !== mod.viewerParentId
    ) {
      buttons.push({
        text: "Скрыть пользователя",
        onPress: () => {
          onLocalMuteSender(item.senderId);
          showMessengerToast("Сообщения этого участника скрыты");
        },
      });
    }
    buttons.push(
      {
        text: "Пожаловаться",
        onPress: () => {
          void (async () => {
            const ok = await postMessageReport(mod.viewerParentId, item.id);
            showMessengerToast(
              ok ? "Жалоба отправлена" : "Не удалось отправить жалобу"
            );
          })();
        },
      }
    );
    if (canBlock && mod.teamId) {
      const tid = mod.teamId;
      const blockedId = item.senderId;
      buttons.push({
        text: "Заблокировать",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Заблокировать пользователя?",
            "Вы не сможете переписываться с этим родителем в этой команде.",
            [
              { text: "Отмена", style: "cancel" },
              {
                text: "Заблокировать",
                style: "destructive",
                onPress: () => {
                  void (async () => {
                    const ok = await postPeerBlock(mod.viewerParentId, blockedId, tid);
                    showMessengerToast(
                      ok ? "Пользователь заблокирован" : "Не удалось выполнить блокировку"
                    );
                  })();
                },
              },
            ]
          );
        },
      });
    }
    buttons.push({ text: "Отмена", style: "cancel" });
    Alert.alert("Сообщение", "Выберите действие", buttons);
  }, [
    item.id,
    item.senderId,
    item.senderType,
    messengerModeration,
    onLocalMuteSender,
  ]);

  const bubbleEase = Easing.bezier(0.25, 0.1, 0.25, 1);
  const entering = FadeInUp.delay(Math.min(index, 10) * 16)
    .duration(265)
    .easing(bubbleEase)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 5 }] });

  const mod = messengerModeration;
  const showModerationPress =
    mod?.enabled &&
    !isCoachMarkMsg &&
    item.senderId !== mod.viewerParentId;

  return (
    <Animated.View entering={entering}>
      {isCoachMarkMsg ? (
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={400}
          accessibilityRole="button"
          accessibilityLabel="Сообщение Арены. Долгое нажатие — сохранить в заметки или память"
          style={({ pressed }) => pressed && styles.bubblePressed}
        >
          {bubbleContent}
        </Pressable>
      ) : showModerationPress ? (
        <Pressable
          onLongPress={handleMessengerLongPress}
          delayLongPress={450}
          accessibilityRole="button"
          accessibilityLabel="Сообщение. Долгое нажатие — пожаловаться или заблокировать"
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

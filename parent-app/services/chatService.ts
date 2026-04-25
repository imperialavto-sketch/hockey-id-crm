/**
 * Arena / AI companion — HTTP к `/api/chat/ai/*` и локальный кеш сообщений.
 * В UI продукт — «Арена» / AI-компаньон; в коде — stable legacy: id `coach-mark`, имена `getCoachMark*`, ключи `coach-mark-*`.
 * Не переименовывать этот слой без отдельного migration pass.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ConversationItem, ChatMessage } from "@/types/chat";
import { apiFetch, getApiBase, ApiRequestError } from "@/lib/api";
import { withFallback } from "@/utils/withFallback";
import { logApiError } from "@/lib/apiErrors";
import {
  getDemoConversations,
  getDemoConversationForPlayer,
  getDemoMessages,
  addDemoMessage,
} from "@/demo/demoChat";
import type { ArenaParentPlayerContext } from "@/types/arenaParentPlayerContext";

const PARENT_ID_HEADER = "x-parent-id";

/** Stable id for the Arena AI companion thread (URL segment remains `coach-mark`). */
export const ARENA_COMPANION_CHAT_ID = "coach-mark" as const;

/** @deprecated Use ARENA_COMPANION_CHAT_ID */
export const COACH_MARK_ID = ARENA_COMPANION_CHAT_ID;

export function isArenaCompanionConversation(id: string): boolean {
  return id === ARENA_COMPANION_CHAT_ID;
}

/** @deprecated Use isArenaCompanionConversation */
export function isCoachMarkConversation(id: string): boolean {
  return isArenaCompanionConversation(id);
}

function headers(parentId: string): Record<string, string> {
  return { [PARENT_ID_HEADER]: parentId };
}

export async function getConversations(
  parentId: string
): Promise<ConversationItem[]> {
  return withFallback(
    async () => {
      try {
        const data = await apiFetch<ConversationItem[]>(
          "/api/chat/conversations",
          { headers: headers(parentId), timeoutMs: 10000 }
        );
        return Array.isArray(data) ? data : [];
      } catch (err) {
        logApiError("chatService.getConversations", err);
        throw err;
      }
    },
    async () => getDemoConversations()
  );
}

export async function getOrCreateConversation(
  parentId: string,
  playerId: string
): Promise<ConversationItem | null> {
  return withFallback(
    async () => {
      try {
        const data = await apiFetch<ConversationItem>(
          "/api/chat/conversations",
          {
            method: "POST",
            headers: headers(parentId),
            body: JSON.stringify({ playerId }),
            timeoutMs: 10000,
          }
        );
        return data ?? null;
      } catch (err) {
        logApiError("chatService.getOrCreateConversation", err);
        return null;
      }
    },
    async () => getDemoConversationForPlayer(parentId, playerId)
  );
}

export async function getConversationMessages(
  conversationId: string,
  parentId: string
): Promise<ChatMessage[]> {
  return withFallback(
    async () => {
      try {
        const data = await apiFetch<ChatMessage[]>(
          `/api/chat/conversations/${conversationId}/messages`,
          { headers: headers(parentId), timeoutMs: 10000 }
        );
        return Array.isArray(data) ? data : [];
      } catch (err) {
        logApiError("chatService.getConversationMessages", err);
        throw err;
      }
    },
    async () => getDemoMessages(conversationId, parentId)
  );
}

export async function sendMessage(
  conversationId: string,
  text: string,
  parentId: string
): Promise<ChatMessage | null> {
  return withFallback(
    async () => {
      try {
        const data = await apiFetch<ChatMessage>(
          `/api/chat/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: headers(parentId),
            body: JSON.stringify({ text }),
            timeoutMs: 10000,
          }
        );
        return data ?? null;
      } catch (err) {
        logApiError("chatService.sendMessage", err);
        return null;
      }
    },
    async () => addDemoMessage(conversationId, text, "parent", parentId)
  );
}

const COACH_MARK_STORAGE_KEY = "coach-mark-messages";

/** Загружает историю Coach Mark с backend. Возвращает null при ошибке. */
export async function getCoachMarkConversation(
  parentId: string
): Promise<ChatMessage[] | null> {
  const path = "/api/chat/ai/conversation";
  const url = `${getApiBase().replace(/\/$/, "")}${path}`;
  if (__DEV__) {
    console.log("[CoachMark] getCoachMarkConversation REQUEST", {
      url,
      parentId,
      hasParentId: !!parentId,
    });
  }
  try {
    const data = await apiFetch<{ conversation?: unknown; messages?: unknown[] }>(
      path,
      { headers: headers(parentId), timeoutMs: 10000 }
    );
    if (__DEV__) {
      console.log("[CoachMark] getCoachMarkConversation RESPONSE", {
        hasConversation: !!data?.conversation,
        messagesCount: Array.isArray(data?.messages) ? data.messages.length : 0,
      });
    }
    const raw = data?.messages;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (m): m is Record<string, unknown> =>
          Boolean(m && typeof m === "object" && typeof (m as { text?: unknown }).text === "string")
      )
      .map((m) => ({
        id: String((m as { id?: unknown }).id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        conversationId: COACH_MARK_ID,
        senderType: ((m as { senderType?: string }).senderType === "parent" ? "parent" : "coach") as "parent" | "coach",
        senderId: String((m as { senderId?: unknown }).senderId ?? COACH_MARK_ID),
        text: String((m as { text: string }).text),
        createdAt: String((m as { createdAt?: unknown }).createdAt ?? new Date().toISOString()),
        readAt: (m as { readAt?: unknown }).readAt as string | null | undefined,
        isAI: Boolean((m as { isAI?: unknown }).isAI === true || (m as { senderId?: string }).senderId === COACH_MARK_ID),
      }));
  } catch (err) {
    if (__DEV__) {
      const status = err instanceof ApiRequestError ? err.status : undefined;
      console.warn("[CoachMark] getCoachMarkConversation FAIL", {
        url,
        parentId,
        status,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    logApiError("chatService.getCoachMarkConversation", err, path);
    return null;
  }
}

/** Загружает историю сообщений Coach Mark из AsyncStorage */
export async function getCoachMarkMessages(
  parentId: string
): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(
      `${COACH_MARK_STORAGE_KEY}-${parentId}`
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ChatMessage =>
        m &&
        typeof m === "object" &&
        typeof (m as ChatMessage).id === "string" &&
        typeof (m as ChatMessage).text === "string" &&
        typeof (m as ChatMessage).createdAt === "string"
    );
  } catch {
    return [];
  }
}

/** Сохраняет историю сообщений Coach Mark в AsyncStorage */
export async function saveCoachMarkMessages(
  parentId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${COACH_MARK_STORAGE_KEY}-${parentId}`,
      JSON.stringify(messages)
    );
  } catch (err) {
    logApiError("chatService.saveCoachMarkMessages", err);
  }
}

export type { ArenaParentPlayerContext } from "@/types/arenaParentPlayerContext";

/** Ключ–значение для долговременного контекста компаньона Арены в теле запроса к AI. */
export interface ArenaCompanionMemoryItem {
  key: string;
  value: string;
}

const HISTORY_LIMIT = 20;
const MEMORY_VALUE_MAX_LEN = 300;

/** Отправляет сообщение в чат компаньона Арены и возвращает ответ AI */
export async function sendMessageToCoachMark(
  text: string,
  parentId: string,
  existingMessages: ChatMessage[],
  playerContext?: ArenaParentPlayerContext | null,
  memories?: ArenaCompanionMemoryItem[]
): Promise<ChatMessage | null> {
  const recentMessages = existingMessages.slice(-HISTORY_LIMIT);
  const history = recentMessages.map((m) => ({
    role: m.senderType === "parent" ? ("user" as const) : ("assistant" as const),
    content: m.text,
  }));

  const body: Record<string, unknown> = {
    text: text.trim(),
    history,
  };
  if (playerContext && typeof playerContext === "object" && playerContext.id) {
    body.playerContext = playerContext;
  }
  if (memories && memories.length > 0) {
    body.memories = memories
      .slice(0, HISTORY_LIMIT)
      .map((m) => ({
        key: m.key,
        value: String(m.value ?? "").slice(0, MEMORY_VALUE_MAX_LEN),
      }))
      .filter((m) => m.key && m.value);
  }

  const doApiCall = async (): Promise<ChatMessage> => {
    const data = await apiFetch<{ text: string; isAI?: boolean }>(
      "/api/chat/ai/message",
      {
        method: "POST",
        headers: headers(parentId),
        body: JSON.stringify(body),
        timeoutMs: 30000,
      }
    );
    if (!data?.text) throw new Error("Empty AI response");
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      conversationId: COACH_MARK_ID,
      senderType: "coach",
      senderId: COACH_MARK_ID,
      text: data.text,
      createdAt: new Date().toISOString(),
      isAI: true,
    };
  };

  try {
    return await doApiCall();
  } catch (err) {
    logApiError("chatService.sendMessageToCoachMark", err);
    throw err;
  }
}

/** Запросить недельный план у компаньона Арены, распарсить и сохранить */
export async function generateWeeklyPlanWithCoachMark(
  parentId: string,
  existingMessages: ChatMessage[],
  playerContext?: ArenaParentPlayerContext | null,
  memories?: ArenaCompanionMemoryItem[]
): Promise<{
  chatMessage: ChatMessage | null;
  savedPlan: Awaited<ReturnType<typeof import("./coachMarkStorage").saveCoachMarkWeeklyPlan>> | null;
}> {
  const prompt =
    "Составь недельный план развития на эту неделю. Формат: сначала строка «Фокус: [главная цель]», затем по дням (Понедельник:, Вторник:, и т.д.) с кратким описанием упражнений или задач на каждый день.";
  let chatMessage: ChatMessage | null;
  try {
    chatMessage = await sendMessageToCoachMark(
      prompt,
      parentId,
      existingMessages,
      playerContext,
      memories
    );
  } catch {
    return { chatMessage: null, savedPlan: null };
  }
  if (!chatMessage?.text) {
    return { chatMessage, savedPlan: null };
  }

  const { parseWeeklyPlanFromText, saveCoachMarkWeeklyPlan } = await import(
    "./coachMarkStorage"
  );
  const parsed = parseWeeklyPlanFromText(chatMessage.text);
  if (parsed && parsed.items.length > 0) {
    const saved = await saveCoachMarkWeeklyPlan(
      parentId,
      { focus: parsed.focus, items: parsed.items },
      playerContext?.id
    );
    return { chatMessage, savedPlan: saved };
  }
  return { chatMessage, savedPlan: null };
}

/** Запросить weekly check-in у компаньона Арены, распарсить и сохранить */
export async function generateWeeklyCheckinWithCoachMark(
  parentId: string,
  existingMessages: ChatMessage[],
  playerContext?: ArenaParentPlayerContext | null,
  memories?: ArenaCompanionMemoryItem[],
  playerId?: string | null
): Promise<{
  chatMessage: ChatMessage | null;
  savedCheckin: Awaited<ReturnType<typeof import("./coachMarkCheckins").saveCoachMarkCheckin>> | null;
}> {
  const prompt =
    "Сделай короткий weekly check-in по игроку: что важно сейчас и какой следующий шаг. Формат: кратко опиши текущее состояние, затем «Следующий шаг:» и конкретное действие.";
  let chatMessage: ChatMessage | null;
  try {
    chatMessage = await sendMessageToCoachMark(
      prompt,
      parentId,
      existingMessages,
      playerContext,
      memories
    );
  } catch {
    return { chatMessage: null, savedCheckin: null };
  }
  if (!chatMessage?.text) {
    return { chatMessage, savedCheckin: null };
  }

  const { parseCheckinFromText, saveCoachMarkCheckin } = await import(
    "./coachMarkCheckins"
  );
  const parsed = parseCheckinFromText(chatMessage.text);
  if (parsed.summary || parsed.nextStep) {
    const saved = await saveCoachMarkCheckin(
      parentId,
      { summary: parsed.summary, nextStep: parsed.nextStep },
      playerId
    );
    return { chatMessage, savedCheckin: saved };
  }
  return { chatMessage, savedCheckin: null };
}

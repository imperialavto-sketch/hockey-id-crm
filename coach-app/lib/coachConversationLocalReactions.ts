/**
 * Локальные микро-реакции на сообщения чата (без сервера).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@coach_conversation_reactions_v1";

export type LocalMessageReaction = "thumb" | "ok";

type StoreShape = Record<string, Record<string, LocalMessageReaction>>;

async function loadAll(): Promise<StoreShape> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoreShape;
  } catch {
    return {};
  }
}

async function saveAll(data: StoreShape): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export async function loadConversationReactions(
  conversationId: string
): Promise<Record<string, LocalMessageReaction>> {
  const all = await loadAll();
  return all[conversationId] ?? {};
}

export async function persistMessageReaction(
  conversationId: string,
  messageId: string,
  reaction: LocalMessageReaction | null
): Promise<Record<string, LocalMessageReaction>> {
  const all = await loadAll();
  const prev = { ...(all[conversationId] ?? {}) };
  if (reaction == null) {
    delete prev[messageId];
  } else {
    prev[messageId] = reaction;
  }
  const next = { ...all, [conversationId]: prev };
  await saveAll(next);
  return prev;
}

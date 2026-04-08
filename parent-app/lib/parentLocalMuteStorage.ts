/**
 * Локальное скрытие участников в чате команды (только клиент, AsyncStorage).
 * Ключ хранилища: `muted_users` → JSON `{ [conversationId]: parentId[] }`.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "muted_users";

export type MutedUsersStore = Record<string, string[]>;

export async function loadMutedUsersStore(): Promise<MutedUsersStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: MutedUsersStore = {};
    for (const [convId, arr] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(arr)) {
        out[convId] = arr.filter((x): x is string => typeof x === "string");
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function getMutedUserIdsForConversation(
  conversationId: string
): Promise<string[]> {
  const all = await loadMutedUsersStore();
  return all[conversationId] ?? [];
}

export async function addMutedUserForConversation(
  conversationId: string,
  senderId: string
): Promise<void> {
  const all = await loadMutedUsersStore();
  const cur = new Set(all[conversationId] ?? []);
  cur.add(senderId);
  all[conversationId] = [...cur];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

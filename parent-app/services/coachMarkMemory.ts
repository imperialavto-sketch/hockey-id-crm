/**
 * Coach Mark Family Memory v1.
 * Локальное хранение фактов о семье/игроке. AsyncStorage, без БД.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMORY_KEY = "coach-mark-memory";

export interface CoachMarkMemory {
  id: string;
  playerId?: string;
  parentId: string;
  createdAt: string;
  key: string;
  value: string;
  source: "coach_mark_memory";
}

const MEMORY_KEY_LABELS: Record<string, string> = {
  preferredFocus: "Фокус развития",
  parentConcern: "Опасение родителя",
  trainingGoal: "Цель тренировок",
  usualScheduleNote: "Расписание",
  note: "Заметка",
};

export function getMemoryKeyLabel(key: string): string {
  if (key.startsWith("note_")) return MEMORY_KEY_LABELS.note;
  return MEMORY_KEY_LABELS[key] ?? key;
}

function storageKey(parentId: string): string {
  return `${MEMORY_KEY}-${parentId}`;
}

async function getStored(parentId: string): Promise<CoachMarkMemory[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(parentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setStored(parentId: string, items: CoachMarkMemory[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(parentId), JSON.stringify(items));
  } catch (err) {
    console.warn("coachMarkMemory setStored failed:", err);
  }
}

/** Сохранить память. Для note — всегда добавлять. Для других key — обновить если есть. */
export async function saveCoachMarkMemory(
  parentId: string,
  memory: { key: string; value: string },
  playerId?: string | null
): Promise<CoachMarkMemory> {
  const items = await getStored(parentId);
  const useKey = memory.key === "note" ? `note_${Date.now()}` : memory.key;
  const existingIdx =
    memory.key === "note"
      ? -1
      : items.findIndex(
          (m) => m.key === memory.key && m.playerId === (playerId ?? undefined)
        );

  const now = new Date().toISOString();
  const full: CoachMarkMemory = {
    id: existingIdx >= 0 ? items[existingIdx].id : `mem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    parentId,
    playerId: playerId ?? undefined,
    createdAt: existingIdx >= 0 ? items[existingIdx].createdAt : now,
    key: useKey,
    value: memory.value.slice(0, 500),
    source: "coach_mark_memory",
  };

  if (existingIdx >= 0) {
    items[existingIdx] = full;
  } else {
    items.unshift(full);
  }
  await setStored(parentId, items);
  return full;
}

/** Получить память Coach Mark */
export async function getCoachMarkMemories(
  parentId: string,
  playerId?: string | null
): Promise<CoachMarkMemory[]> {
  const items = await getStored(parentId);
  if (playerId) {
    return items.filter((m) => m.playerId === playerId || !m.playerId);
  }
  return items;
}

/** Удалить память */
export async function deleteCoachMarkMemory(
  parentId: string,
  memoryId: string
): Promise<boolean> {
  const items = await getStored(parentId);
  const filtered = items.filter((m) => m.id !== memoryId);
  if (filtered.length === items.length) return false;
  await setStored(parentId, filtered);
  return true;
}

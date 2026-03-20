/**
 * Coach Mark Weekly Check-ins v1.
 * Локальное хранение в AsyncStorage. Без БД.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const CHECKINS_KEY = "coach-mark-checkins";

export interface CoachMarkCheckin {
  id: string;
  playerId?: string;
  parentId: string;
  createdAt: string;
  summary: string;
  nextStep: string;
  source: "coach_mark_checkin";
}

function storageKey(parentId: string): string {
  return `${CHECKINS_KEY}-${parentId}`;
}

async function getStored(parentId: string): Promise<CoachMarkCheckin[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(parentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setStored(parentId: string, items: CoachMarkCheckin[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(parentId), JSON.stringify(items));
  } catch (err) {
    console.warn("coachMarkCheckins setStored failed:", err);
  }
}

/** Простой парсер v1: ищем "Следующий шаг:" / "Next step:" и т.п. */
export function parseCheckinFromText(text: string): { summary: string; nextStep: string } {
  const trimmed = text.trim();
  if (!trimmed) return { summary: "", nextStep: "" };

  const nextStepPatterns = [
    /следующий\s*шаг\s*:?\s*/i,
    /след\.?\s*шаг\s*:?\s*/i,
    /next\s*step\s*:?\s*/i,
    /что\s*дальше\s*:?\s*/i,
    /рекомендую\s*:?\s*/i,
    /действие\s*:?\s*/i,
  ];

  for (const re of nextStepPatterns) {
    const idx = trimmed.search(re);
    if (idx >= 0) {
      const summary = trimmed.slice(0, idx).trim();
      const rest = trimmed.slice(idx).replace(re, "").trim();
      return {
        summary: summary || trimmed,
        nextStep: rest || trimmed,
      };
    }
  }

  // Fallback: первая часть (до двойного \n) = summary, остальное = nextStep
  const parts = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      summary: parts[0] ?? "",
      nextStep: parts.slice(1).join("\n\n"),
    };
  }
  return { summary: trimmed, nextStep: "" };
}

/** Сохранить check-in */
export async function saveCoachMarkCheckin(
  parentId: string,
  checkin: { summary: string; nextStep: string },
  playerId?: string | null
): Promise<CoachMarkCheckin> {
  const items = await getStored(parentId);
  const now = new Date().toISOString();
  const full: CoachMarkCheckin = {
    id: `checkin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    parentId,
    playerId: playerId ?? undefined,
    createdAt: now,
    summary: checkin.summary.slice(0, 1000),
    nextStep: checkin.nextStep.slice(0, 500),
    source: "coach_mark_checkin",
  };
  items.unshift(full);
  await setStored(parentId, items);
  return full;
}

/** Получить check-ins (последний первый) */
export async function getCoachMarkCheckins(
  parentId: string,
  playerId?: string | null
): Promise<CoachMarkCheckin[]> {
  const items = await getStored(parentId);
  if (playerId) {
    return items.filter((i) => i.playerId === playerId || !i.playerId);
  }
  return items;
}

/**
 * Coach Mark Notes & Weekly Plan v1.
 * Локальное хранение в AsyncStorage. Без БД.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTES_KEY = "coach-mark-notes";
const PLANS_KEY = "coach-mark-plans";
const CALENDAR_KEY = "coach-mark-calendar";

export interface CoachMarkNote {
  id: string;
  playerId?: string;
  parentId: string;
  createdAt: string;
  text: string;
  type: "coach_mark_note";
}

export interface WeeklyPlanItem {
  day: string;
  title: string;
  details: string;
}

export interface CoachMarkWeeklyPlan {
  id: string;
  playerId?: string;
  parentId: string;
  createdAt: string;
  focus: string;
  items: WeeklyPlanItem[];
}

/** Calendar-ready item для будущего add-to-calendar flow */
export interface CoachMarkCalendarItem {
  id: string;
  playerId?: string;
  createdAt: string;
  title: string;
  details: string;
  day: string;
  suggestedTime?: string;
  durationMinutes?: number;
  source: "coach_mark_plan";
}

function storageKey(base: string, parentId: string): string {
  return `${base}-${parentId}`;
}

async function getStored<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setStored<T>(key: string, items: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.warn("coachMarkStorage setStored failed:", err);
  }
}

/** Сохранить заметку Coach Mark */
export async function saveCoachMarkNote(
  parentId: string,
  text: string,
  playerId?: string | null
): Promise<CoachMarkNote> {
  const key = storageKey(NOTES_KEY, parentId);
  const notes = await getStored<CoachMarkNote>(key);
  const note: CoachMarkNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    parentId,
    playerId: playerId ?? undefined,
    createdAt: new Date().toISOString(),
    text,
    type: "coach_mark_note",
  };
  notes.unshift(note);
  await setStored(key, notes);
  return note;
}

/** Получить заметки Coach Mark */
export async function getCoachMarkNotes(
  parentId: string,
  playerId?: string | null
): Promise<CoachMarkNote[]> {
  const key = storageKey(NOTES_KEY, parentId);
  const notes = await getStored<CoachMarkNote>(key);
  if (playerId) {
    return notes.filter((n) => n.playerId === playerId || !n.playerId);
  }
  return notes;
}

/** Сохранить недельный план Coach Mark */
export async function saveCoachMarkWeeklyPlan(
  parentId: string,
  plan: Omit<CoachMarkWeeklyPlan, "id" | "createdAt" | "parentId">,
  playerId?: string | null
): Promise<CoachMarkWeeklyPlan> {
  const key = storageKey(PLANS_KEY, parentId);
  const plans = await getStored<CoachMarkWeeklyPlan>(key);
  const full: CoachMarkWeeklyPlan = {
    ...plan,
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    parentId,
    playerId: playerId ?? plan.playerId ?? undefined,
    createdAt: new Date().toISOString(),
  };
  plans.unshift(full);
  await setStored(key, plans);
  return full;
}

/** Получить недельные планы Coach Mark */
export async function getCoachMarkWeeklyPlans(
  parentId: string,
  playerId?: string | null
): Promise<CoachMarkWeeklyPlan[]> {
  const key = storageKey(PLANS_KEY, parentId);
  const plans = await getStored<CoachMarkWeeklyPlan>(key);
  if (playerId) {
    return plans.filter((p) => p.playerId === playerId || !p.playerId);
  }
  return plans;
}

/** Парсинг текста ответа Coach Mark в структуру недельного плана */
const DAY_PATTERNS = [
  /понедельник|monday|пн\b/i,
  /вторник|tuesday|вт\b/i,
  /среда|wednesday|ср\b/i,
  /четверг|thursday|чт\b/i,
  /пятница|friday|пт\b/i,
  /суббота|saturday|сб\b/i,
  /воскресенье|sunday|вс\b/i,
];

const DAY_NAMES_RU = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

export function parseWeeklyPlanFromText(text: string): {
  focus: string;
  items: WeeklyPlanItem[];
} | null {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  let focus = "";
  const items: WeeklyPlanItem[] = [];
  const dayToName: Record<number, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Ищем фокус в начале (Фокус:, Цель:, На этой неделе: и т.д.)
    if (
      !focus &&
      (lower.startsWith("фокус:") ||
        lower.startsWith("цель:") ||
        lower.startsWith("на этой неделе:") ||
        lower.startsWith("главное:"))
    ) {
      focus = line.replace(/^[^:]+:\s*/i, "").trim();
      continue;
    }

    // Ищем день недели
    for (let d = 0; d < DAY_PATTERNS.length; d++) {
      if (DAY_PATTERNS[d].test(line)) {
        const dayName = DAY_NAMES_RU[d];
        const rest = line.replace(DAY_PATTERNS[d], "").replace(/^[:\s\-–—]+/, "").trim();
        const colonIdx = rest.indexOf(":");
        const title = colonIdx >= 0 ? rest.slice(0, colonIdx).trim() : rest;
        const details = colonIdx >= 0 ? rest.slice(colonIdx + 1).trim() : "";
        items.push({ day: dayName, title: title || rest, details });
        break;
      }
    }
  }

  if (items.length === 0 && focus) {
    return { focus, items: [] };
  }
  if (items.length > 0) {
    return {
      focus: focus || "Недельный план",
      items,
    };
  }
  return null;
}

/** Извлечь время из текста (HH:MM или "в 18:00", "18:30" и т.д.) */
function extractTimeFromText(text: string): string | undefined {
  const m = text.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return undefined;
}

const DEFAULT_DURATION_MINUTES = 45;

/** Конвертировать weekly plan в calendar-ready items */
export function convertWeeklyPlanToCalendarItems(
  plan: CoachMarkWeeklyPlan
): CoachMarkCalendarItem[] {
  const items: CoachMarkCalendarItem[] = [];
  const baseId = `cal-${plan.id}-`;
  for (let i = 0; i < plan.items.length; i++) {
    const it = plan.items[i];
    const combined = `${it.title} ${it.details}`.trim();
    const suggestedTime = extractTimeFromText(combined) ?? undefined;
    items.push({
      id: `${baseId}${i}`,
      playerId: plan.playerId,
      createdAt: plan.createdAt,
      title: it.title || it.details || "Тренировка",
      details: it.details,
      day: it.day,
      suggestedTime,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      source: "coach_mark_plan",
    });
  }
  return items;
}

/** Сохранить calendar items локально */
export async function saveCoachMarkCalendarItems(
  parentId: string,
  items: CoachMarkCalendarItem[],
  playerId?: string | null
): Promise<void> {
  const key = storageKey(CALENDAR_KEY, parentId);
  const existing = await getStored<CoachMarkCalendarItem>(key);
  const withPlayer = items.map((it) => ({
    ...it,
    playerId: playerId ?? it.playerId,
  }));
  await setStored(key, [...withPlayer, ...existing]);
}

/** Получить calendar items */
export async function getCoachMarkCalendarItems(
  parentId: string,
  playerId?: string | null
): Promise<CoachMarkCalendarItem[]> {
  const key = storageKey(CALENDAR_KEY, parentId);
  const items = await getStored<CoachMarkCalendarItem>(key);
  if (playerId) {
    return items.filter((i) => i.playerId === playerId || !i.playerId);
  }
  return items;
}

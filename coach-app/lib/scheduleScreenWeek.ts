/**
 * Локальная сетка недели (пн–вс) для экранов расписания и создания тренировки.
 * Даты — календарные в локальной TZ (`toLocalDateKey`), без UTC-сдвига `toISOString().slice(0,10)`.
 *
 * Параметр недели для API: {@link weekStartParamFromLocalMonday} в `scheduleWeekUtc.ts`.
 */

/** YYYY-MM-DD по локальному календарю. */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Понедельник 00:00 локально для даты `d`. */
export function getWeekStartMondayLocal(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDaysLocal(base: Date, deltaDays: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + deltaDays);
  return x;
}

export function getPrevWeekStart(weekStartMonday: Date): Date {
  return addDaysLocal(weekStartMonday, -7);
}

export function getNextWeekStart(weekStartMonday: Date): Date {
  return addDaysLocal(weekStartMonday, 7);
}

/** Семь дат: пн … вс от заданного понедельника. */
export function getWeekDates(weekStartMonday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDaysLocal(weekStartMonday, i));
  }
  return days;
}

export const WEEKDAY_LABELS_SHORT_RU = [
  "Пн",
  "Вт",
  "Ср",
  "Чт",
  "Пт",
  "Сб",
  "Вс",
] as const;

export type WeekDayPickerItem = { date: Date; label: string; key: string };

/** Чипы выбора дня на экране создания (лейбл «Пн 3» и ключ даты). */
export function getWeekDayPickerItems(
  weekStartMonday: Date,
  weekdayLabels: readonly string[] = WEEKDAY_LABELS_SHORT_RU
): WeekDayPickerItem[] {
  const items: WeekDayPickerItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDaysLocal(weekStartMonday, i);
    items.push({
      date: d,
      label: `${weekdayLabels[i] ?? "?"} ${d.getDate()}`,
      key: toLocalDateKey(d),
    });
  }
  return items;
}

/** Заголовок дня на доске недели: «пн, 3 мар.». */
export function formatDayBoardHeaderRu(day: Date): string {
  try {
    return day.toLocaleDateString("ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    const i = (day.getDay() + 6) % 7;
    return `${WEEKDAY_LABELS_SHORT_RU[i] ?? "?"} ${day.getDate()}`;
  }
}

/** «3 мар. – 9 мар. 2026 г.» */
export function formatWeekRangeRu(weekStartMonday: Date): string {
  const end = addDaysLocal(weekStartMonday, 6);
  const a = weekStartMonday.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const b = end.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${a} – ${b}`;
}

/** Компактно: 03.03 – 09.03 (как раньше на create). */
export function formatWeekRangeNumeric(weekStartMonday: Date): string {
  const end = addDaysLocal(weekStartMonday, 6);
  return `${weekStartMonday.getDate()}.${String(weekStartMonday.getMonth() + 1).padStart(2, "0")} – ${end.getDate()}.${String(end.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Copy + week label formatting for parent schedule tab (no API logic).
 */

import { PARENT_FLAGSHIP } from "./parentFlagshipShared";

export const SCHEDULE_COPY = {
  heroTitle: "Расписание",
  heroSubWithSchedule:
    "Тренировки и игры выбранного ребёнка на неделю. Без группы показывается расписание команды.",
  heroSubEmpty:
    "Тренировки и игры группы ребёнка на неделю. Если группа не назначена — общее расписание команды.",
  loadingHint: "Загружаем расписание…",
  loadErrorTitle: "Расписание не загрузилось",
  loadErrorSubtitle: PARENT_FLAGSHIP.networkRetrySubtitle,
  emptyTitle: "Пока нет событий",
  emptySub:
    "Когда тренер добавит тренировки и игры, они появятся здесь.",
  sectionUpcoming: "Ближайшие",
  sectionWeek: "Вся неделя",
  coachMarkTitle: "Coach Mark",
  coachMarkDescription:
    "Персональный план на неделю с учётом вашего расписания — в чате",
} as const;

/** `weekStart` is YYYY-MM-DD (Monday). */
export function formatScheduleWeekLabel(weekStart: string): string {
  const parts = weekStart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return weekStart;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return weekStart;
  return dt.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

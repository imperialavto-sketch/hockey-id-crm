/**
 * Типы объявлений команды (храним в TeamFeedPost.type).
 * Поддерживаем старые значения при чтении; новые публикации — только канонические.
 */

export const TEAM_ANNOUNCEMENT_KINDS = [
  "general",
  "schedule_change",
  "game_day",
  "important",
] as const;

export type TeamAnnouncementKind = (typeof TEAM_ANNOUNCEMENT_KINDS)[number];

const LEGACY_TO_CANONICAL: Record<string, TeamAnnouncementKind> = {
  announcement: "general",
  news: "general",
  schedule_update: "schedule_change",
  match_day: "game_day",
  photo_post: "general",
};

/** Нормализует тип для родительского приложения (kind). */
export function announcementKindForParent(type: string): TeamAnnouncementKind {
  const t = type?.trim() ?? "";
  if (TEAM_ANNOUNCEMENT_KINDS.includes(t as TeamAnnouncementKind)) {
    return t as TeamAnnouncementKind;
  }
  return LEGACY_TO_CANONICAL[t] ?? "general";
}

/** Проверка типа при создании/редактировании из CRM. */
export function isAllowedAnnouncementKind(type: string): type is TeamAnnouncementKind {
  return TEAM_ANNOUNCEMENT_KINDS.includes(type as TeamAnnouncementKind);
}

/** Разрешённые значения при создании (канон + легаси-ключи). */
export function parseAnnouncementTypeForWrite(raw: string): TeamAnnouncementKind | null {
  const t = raw?.trim() ?? "";
  if (isAllowedAnnouncementKind(t)) return t;
  const mapped = LEGACY_TO_CANONICAL[t];
  return mapped ?? null;
}

/** Текст пуша по типу (краткий заголовок). */
export function pushTitleForAnnouncementKind(kind: string): string {
  const k = announcementKindForParent(kind);
  switch (k) {
    case "schedule_change":
      return "Изменение расписания";
    case "game_day":
      return "День игры";
    case "important":
      return "Важное объявление";
    default:
      return "Новое объявление команды";
  }
}

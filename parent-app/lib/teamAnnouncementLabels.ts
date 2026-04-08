/** Короткие подписи типа объявления (TeamFeedPost.type) для родителя */

const KIND_LABELS: Record<string, string> = {
  announcement: "Важно",
  news: "Новость",
  match_day: "Игровой день",
  schedule_change: "Расписание",
  photo_post: "Материал",
  team_update: "Команда",
  general: "Объявление",
  important: "Важное",
  game_day: "День игры",
  schedule_update: "Расписание",
};

export function announcementKindLabel(kind: string): string {
  const k = kind?.trim();
  if (!k) return "Объявление";
  return KIND_LABELS[k] ?? "Объявление";
}

export function formatAnnouncementDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

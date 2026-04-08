/** Локализованные подписи типов и статусов сессии расписания (экран schedule/[id]). */

export const SCHEDULE_SESSION_TYPE_LABELS: Record<string, string> = {
  ice: "Лёд",
  ofp: "ОФП",
  hockey: "Лёд",
  game: "Лёд",
  individual: "Лёд",
};

export const SCHEDULE_SESSION_STATUS_LABELS: Record<string, string> = {
  planned: "Запланирована",
  in_progress: "Идёт",
  completed: "Завершена",
  cancelled: "Отменена",
  draft: "Черновик",
};

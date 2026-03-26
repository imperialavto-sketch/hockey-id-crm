/**
 * Copy for CRM player card (`(dashboard)/players/[id]/page`). No business logic.
 */

import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

export const CRM_PLAYER_DETAIL_COPY = {
  heroEyebrow: "Карточка игрока",
  heroSubtitle:
    "Профиль, родители, аналитика и журналы — переключайтесь по табам; паспорт и редактирование — в шапке.",
  loadingTitle: "Загружаем карточку",
  loadingHint: "Профиль, разделы и связанные данные.",
  errorTitle: "Не удалось загрузить игрока",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  notFoundTitle: "Игрок не найден",
  notFoundHint: "Проверьте ссылку или вернитесь к списку базы.",
  backToList: "К списку игроков",
  backShort: "Назад к игрокам",
  backSchedule: "К расписанию",
  notFoundScheduleCta: "К расписанию",
  passportCta: "Карьерный паспорт",
  editCta: "Редактировать",
  sectionKicker: "Раздел",
  noTeam: "Без команды",
} as const;

/** Short hint under active tab title — CRM tone, no extra product scope */
export const CRM_PLAYER_DETAIL_TAB_HINTS: Record<string, string> = {
  general: "Паспортные поля и привязка к команде в CRM.",
  parents: "Связанные контакты и приглашения родителей.",
  aiAnalysis: "ИИ-сводка при наличии данных на сервере.",
  progressHistory: "Месячные срезы прогресса.",
  passport: "Документы для поездок и регистраций.",
  skills: "Оценки навыков по шкале 0–100.",
  stats: "Сезонная статистика в таблице.",
  medical: "Медицинский контур и ограничения.",
  videos: "Ссылки на материалы.",
  achievements: "Награды и прогресс по целям.",
  attendance: "Тренировки и статус посещения.",
  finance: "Платежи и статусы оплат.",
  ratings: "Оценки и комментарии тренеров.",
};

/** Status pill — aligned with CRM players list tone */
export function crmPlayerDetailStatusPillClass(status: string): string {
  if (status === "Активен") {
    return "border border-neon-green/40 bg-neon-green/20 text-neon-green";
  }
  if (status === "На паузе") {
    return "border border-amber-500/35 bg-amber-500/15 text-amber-200";
  }
  if (status === "Травма") {
    return "border border-rose-500/35 bg-rose-500/15 text-rose-200";
  }
  if (status === "Выпускник") {
    return "border border-white/15 bg-slate-500/15 text-slate-300";
  }
  return "border border-white/20 bg-white/10 text-slate-400";
}

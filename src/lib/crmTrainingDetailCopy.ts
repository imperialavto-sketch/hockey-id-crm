/**
 * Copy for CRM training detail (`(dashboard)/trainings/[id]/page`). No business logic.
 */

import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

export const CRM_TRAINING_DETAIL_COPY = {
  heroEyebrow: "Карточка тренировки",
  loadingTitle: "Загружаем тренировку",
  loadingHint: "Состав, посещаемость и оценки.",
  errorTitle: "Не удалось загрузить тренировку",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  notFoundTitle: "Тренировка не найдена",
  notFoundHint: "Проверьте ссылку или вернитесь к расписанию.",
  backSchedule: "Назад к расписанию",
  backToScheduleCta: "К расписанию",
  backTrainingsCta: "К списку тренировок",
  attendanceKicker: "Состав",
  attendanceTitle: "Посещаемость и оценки",
  markAllPresent: "Отметить всех присутствующими",
  emptyRoster: "В команде пока нет игроков",
  colPlayer: "Игрок",
  colStatus: "Статус",
  colRating: "Оценка",
  colComment: "Комментарий",
  commentPlaceholder: "Комментарий",
  noCoachRating: "Нет тренера",
  minutesShort: "мин",
} as const;

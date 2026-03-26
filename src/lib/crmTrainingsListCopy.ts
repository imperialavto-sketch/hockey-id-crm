/**
 * Copy for CRM trainings list (`(dashboard)/trainings/page`). No business logic.
 */

import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

export const CRM_TRAININGS_LIST_COPY = {
  heroEyebrow: "Журнал",
  heroTitle: "Тренировки",
  heroSubtitle: "Все слоты школы: ближайшие и прошедшие — откройте строку для посещаемости и оценок.",
  addTrainingCta: "Добавить тренировку",
  scheduleLink: "К расписанию",
  listKicker: "Список",
  listTitle: "Все тренировки",
  loadingTitle: "Загружаем тренировки",
  loadingHint: "Слоты по командам и времени.",
  errorTitle: "Не удалось загрузить тренировки",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  emptyTitle: "Тренировок пока нет",
  emptyHint: "Создайте первую — она появится здесь и в расписании.",
  emptyAddCta: "Создать тренировку",
  metaUpcoming: "Скоро",
  metaLive: "Сейчас",
  metaPast: "Прошла",
  coachPrefix: "Тренер",
  noLocation: "Место не указано",
} as const;

/** Client-only time context for scan-friendly row meta (no API field). */
export function crmTrainingListTimeMeta(startIso: string, endIso: string): string {
  const now = Date.now();
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return "";
  if (e < now) return CRM_TRAININGS_LIST_COPY.metaPast;
  if (s > now) return CRM_TRAININGS_LIST_COPY.metaUpcoming;
  return CRM_TRAININGS_LIST_COPY.metaLive;
}

/**
 * Copy for CRM schedule hub (`(dashboard)/schedule/page`). No business logic.
 */

import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

export const CRM_SCHEDULE_COPY = {
  heroEyebrow: "План",
  heroTitle: "Расписание",
  heroSubtitle: "Список и календарь тренировок школы — откройте карточку для посещаемости и деталей.",
  viewKicker: "Вид",
  viewHint: "Переключайтесь между списком и календарём — данные одни и те же.",
  listView: "Список",
  calendarView: "Календарь",
  addTrainingCta: "Тренировка",
  loadingTitle: "Загружаем расписание",
  loadingHint: "Тренировки, команды и слоты.",
  errorTitle: "Не удалось загрузить расписание",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  emptyTitle: "Тренировки не запланированы",
  emptyHint: "Создайте первую тренировку — она появится и в списке, и в календаре.",
  emptyAddCta: "Добавить тренировку",
  listKicker: "Список",
  listTitle: "Тренировки",
  calendarKicker: "Месяц",
} as const;

/**
 * Copy for CRM teams list (`(dashboard)/teams/page`). No business logic.
 */

import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

export const CRM_TEAMS_LIST_COPY = {
  heroEyebrow: "Школа",
  heroTitle: "Команды",
  heroSubtitle: "Поиск и группа — карточка команды, состав и тренировки в один клик.",
  scheduleLink: "К расписанию",
  createTeamCta: "Создать команду",
  searchPlaceholder: "Поиск по названию…",
  filterAgeAll: "Все возрастные группы",
  filtersKicker: "Фильтры",
  filtersHint: "Запрос к списку обновляется при изменении полей.",
  listKicker: "Список",
  listTitle: "Команды школы",
  loadingTitle: "Загружаем команды",
  loadingHint: "Составы и метаданные по фильтрам.",
  errorTitle: "Не удалось загрузить команды",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  emptyFilteredTitle: "Ничего не найдено",
  emptyFilteredHint: "Сбросьте поиск или смените возрастную группу.",
  emptyNoTeamsTitle: "Пока нет команд",
  emptyNoTeamsHint: "Добавьте первую команду школы.",
  emptyAddCta: "Создать команду",
  openTeamCta: "Открыть команду",
  coachPrefix: "Тренер",
  noCoach: "Не назначен",
  schoolLabel: "Школа",
  editAria: "Редактировать команду",
  scheduleTeamAria: "Расписание команды",
} as const;

/** RU plural: «N команда / команды / команд» */
export function crmTeamsCountLabel(n: number): string {
  const abs10 = n % 10;
  const abs100 = n % 100;
  if (abs10 === 1 && abs100 !== 11) return `${n} команда`;
  if (abs10 >= 2 && abs10 <= 4 && (abs100 < 10 || abs100 >= 20)) return `${n} команды`;
  return `${n} команд`;
}

/** RU plural: «N тренировка / тренировки / тренировок» */
export function crmTeamTrainingsCountLabel(n: number): string {
  const abs10 = n % 10;
  const abs100 = n % 100;
  if (abs10 === 1 && abs100 !== 11) return `${n} тренировка`;
  if (abs10 >= 2 && abs10 <= 4 && (abs100 < 10 || abs100 >= 20)) return `${n} тренировки`;
  return `${n} тренировок`;
}

/**
 * Copy for CRM players list (`(dashboard)/players/page`). No business logic.
 */

import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

export const CRM_PLAYERS_LIST_COPY = {
  heroEyebrow: "База",
  heroTitle: "Игроки",
  heroSubtitle: "Фильтры и поиск — откройте карточку в CRM; паспорт и правка — рядом в строке.",
  scheduleLink: "К расписанию",
  addPlayerCta: "Добавить игрока",
  searchPlaceholder: "Поиск по ФИО…",
  filterTeamAll: "Все команды",
  filterAgeAll: "Все возраста",
  filterPositionAll: "Все позиции",
  filterStatusAll: "Все статусы",
  filtersKicker: "Фильтры",
  filtersHint: "Уточните список — запрос обновится автоматически.",
  listKicker: "Список",
  listTitle: "Состав",
  loadingTitle: "Загружаем список",
  loadingHint: "Игроки и фильтры по командам.",
  errorTitle: "Не удалось загрузить игроков",
  errorHint: CRM_DASHBOARD_COPY.errorHint,
  retryCta: CRM_DASHBOARD_COPY.retryCta,
  emptyFilteredTitle: "Ничего не найдено",
  emptyFilteredHint: "Сбросьте или измените фильтры и поиск.",
  emptyNoPlayersTitle: "Пока нет игроков",
  emptyNoPlayersHint: "Добавьте первого игрока в базу школы.",
  emptyAddCta: "Добавить игрока",
  passportAria: "Карьерный паспорт",
  editAria: "Редактировать в CRM",
} as const;

/** RU plural: «N игрок / игрока / игроков» */
export function crmPlayersCountLabel(n: number): string {
  const abs10 = n % 10;
  const abs100 = n % 100;
  if (abs10 === 1 && abs100 !== 11) return `${n} игрок`;
  if (abs10 >= 2 && abs10 <= 4 && (abs100 < 10 || abs100 >= 20)) return `${n} игрока`;
  return `${n} игроков`;
}

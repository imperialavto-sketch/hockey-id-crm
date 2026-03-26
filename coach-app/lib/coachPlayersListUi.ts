/**
 * Copy for coach players tab (`(tabs)/players`). No business logic.
 */

import { COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

export const COACH_PLAYERS_LIST_COPY = {
  loadingRoster: 'Загружаем список…',
  /** Under hero when roster loaded empty (no error). */
  heroEmptySubtitle: 'Список команд пуст — проверьте назначение в системе.',
  emptyNoPlayersTitle: 'Пока нет игроков',
  emptyNoPlayersHint: 'Убедитесь, что вас назначили на команду.',
  emptyFilterTitle: 'Никого по этому фильтру',
  emptyFilterHint: 'Смените фильтр или вернитесь к «Все».',
  overviewAllGood: 'Все игроки в порядке',
  overviewAllGoodHint: 'Нет меток наблюдения и запросов на контакт.',
} as const;

/** Aligned with dashboard home error pattern. */
export const COACH_PLAYERS_NETWORK_RETRY_HINT = COACH_DASHBOARD_COPY.networkRetryHint;

/** Same retry label as dashboard / flagship coach surfaces. */
export const COACH_PLAYERS_RETRY_CTA = COACH_DASHBOARD_COPY.retryCta;

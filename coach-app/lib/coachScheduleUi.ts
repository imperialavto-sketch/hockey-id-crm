/**
 * Copy for coach schedule (`schedule/index`). No business logic.
 */

import { COACH_AUTH_REQUIRED_LINE, COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

/** Alias for schedule screen — same user-facing auth line as rest of coach premium. */
export const COACH_SCHEDULE_AUTH_LINE = COACH_AUTH_REQUIRED_LINE;

export const COACH_SCHEDULE_COPY = {
  heroEyebrow: 'Расписание',
  heroHint: 'Неделя и тренировки выбранной команды.',
  teamPickerLabel: 'Команда:',
  loadingHint: 'Загружаем расписание…',
  loadErrorFallback: 'Не удалось загрузить расписание',
  networkRetryHint: COACH_DASHBOARD_COPY.networkRetryHint,
  retryCta: COACH_DASHBOARD_COPY.retryCta,
  createCta: 'Новая тренировка',
  noTeamsTitle: 'Нет доступных команд',
  noTeamsSubtitle: 'Попросите администратора назначить вас на команду.',
  emptyWeekTitle: 'Нет тренировок на неделю',
  emptyWeekAction: 'Создать',
  weekSectionTitle: 'Неделя',
  quickToday: 'Сегодня',
  quickTomorrow: 'Завтра',
  dayFree: 'Свободно',
} as const;

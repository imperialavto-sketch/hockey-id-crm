/**
 * Copy for coach weekly reports hub (`app/reports.tsx`). No business logic.
 */

import { COACH_AUTH_REQUIRED_LINE, COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

export { COACH_AUTH_REQUIRED_LINE };

export const COACH_REPORTS_SCREEN_COPY = {
  heroEyebrow: 'Итоги недели',
  heroTitle: 'Отчёты тренера',
  heroSubtitleLoaded:
    'Архив готовых отчётов по игрокам: превью здесь, полный разбор и шаринг — в карточке игрока.',
  heroSubtitleError: 'Когда список снова загрузится, здесь появятся сохранённые отчёты.',
  loadingCountLabel: 'Загружаем…',
  loadingSubtitle: 'Подтягиваем готовые отчёты по игрокам.',
  loadErrorGeneric: 'Не удалось получить отчёты.',
  networkRetryHint: COACH_DASHBOARD_COPY.networkRetryHint,
  errorHeading: 'Не получилось загрузить отчёты',
  errorBody:
    'Список временно недоступен — сами отчёты на сервере не пропали. Повторите попытку чуть позже.',
  retryCta: COACH_DASHBOARD_COPY.retryCta,
  errorCountLabel: '—',
  summaryKicker: 'Сводка',
  emptyArchiveLabel: 'Архив пуст',
  emptyTitleUnavailable: 'Раздел пока настраивается',
  emptyTitleNone: 'Готовых отчётов пока нет',
  emptyBodyUnavailable:
    'Когда API будет доступен, список заполнится автоматически.',
  emptyBodyNone:
    'Отчёты по игрокам связаны с материалами тренера. Каноническая живая тренировка — раздел Arena / live-training; локальная запись сессии — отдельный legacy-контур. Ниже — быстрые переходы.',
  emptyRetryEndpoint: 'Проверить снова',
  emptyCtaTraining: 'Живая тренировка (Arena)',
  emptyCtaVoice: 'Голосовая заметка',
  emptyCtaPlayers: 'К игрокам',
  quickTitle: 'Дальше работа с материалом',
  quickHint:
    'Живая тренировка (live-training) — основной путь; игроки и материалы — рядом.',
  quickPlayers: 'Игроки',
  quickTraining: 'Живая тренировка',
  quickVoice: 'Голос',
  quickMaterials: 'Материалы',
  listSectionTitle: 'Готовые отчёты',
  listSectionHint:
    'Сначала — в фокусе по баллу и свежее по дате (если дата есть в ответе API).',
  groupRecent: 'Недавно обновлённые',
  groupRest: 'Остальные',
  statTotal: 'Всего',
  statFreshnessFallback: 'Свежесть',
  statFocus: 'В фокусе',
  statScore: 'Балл',
  reportKicker: 'Отчёт по игроку',
  badgeFocus: 'В фокусе',
  badgeReady: 'Готов',
  reportSecondaryFallback: 'Детали периода и выводы — внутри отчёта.',
  reportPreviewEmpty:
    'Краткое превью не заполнено — полный текст откроется в карточке отчёта игрока.',
  reportOpenCta: 'Открыть отчёт',
  reportPlayerFallback: 'Игрок',
  labelUpdated: 'Обновление',
  labelObservations: 'Наблюдений',
  labelAvgScore: 'Средний балл',
} as const;

export function reportsStatMidLabel(hasAnyDates: boolean, recentWindowDays: number): string {
  return hasAnyDates ? `≤${recentWindowDays} дн.` : COACH_REPORTS_SCREEN_COPY.statFreshnessFallback;
}

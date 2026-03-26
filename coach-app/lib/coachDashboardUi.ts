/**
 * Copy for coach home dashboard (`(tabs)/index`). No business logic.
 *
 * Shared coach premium tokens (auth, retry) — keep in sync across flagship surfaces.
 */

/** User-facing line when coach API requires login (schedule, messages, player, reports, …). */
export const COACH_AUTH_REQUIRED_LINE = 'Нужна авторизация в приложении.';

export const COACH_DASHBOARD_COPY = {
  /** Under hero when hub has loaded. */
  heroSubtitleResume:
    'Черновик тренировки можно продолжить или завершить — материалы появятся в «Создано».',
  heroSubtitleDefault:
    'Тренировка · сообщения · задачи · отчёты — один контур до и после сессии.',
  /** Hub snapshot loading (status primary line). */
  loadingHubStatus: 'Загружаем состояние…',
  /** Inline blocks (teams list, messages preview). */
  loadingBlock: 'Загружаем…',
  /** Spotlight card while hub recomputes. */
  spotlightLoadingBody: 'Подбираем, что важно сейчас…',
  /** When hub is idle and nothing to highlight in secondary line. */
  statusSecondaryFallback: 'Сводка ниже — детали в разделах.',
  summaryHint:
    'Сообщения, задачи по игрокам и готовые отчёты. Нажмите ячейку, чтобы перейти.',
  quickGridHint:
    'Тренировка и ключевые разделы — без дублирования сводки выше.',
  softPartialNotice:
    'Не все блоки ответили — остальное откроется в разделах ниже, работа не блокируется.',
  /** Shown under generic load errors (not auth). */
  networkRetryHint: 'Проверьте соединение и нажмите «Повторить».',
  /** Primary retry label on error cards / states (flagship coach). */
  retryCta: 'Повторить',
  teamsEmptyHint: 'Попросите администратора назначить вас на команду.',
  messagesEmptyHint: 'Диалоги появятся, когда родители напишут.',
} as const;

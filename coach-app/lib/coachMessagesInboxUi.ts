/**
 * Copy for coach messages tab / inbox (`(tabs)/messages`). No business logic.
 */

import { COACH_AUTH_REQUIRED_LINE, COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

/** Matches `getCoachMessages` catch in messages screen. */
export const COACH_MESSAGES_AUTH_LINE = COACH_AUTH_REQUIRED_LINE;

export const COACH_MESSAGES_INBOX_COPY = {
  listEyebrow: 'Входящие',
  listTitle: 'Диалоги',
  loadingCount: 'Загружаем…',
  loadingSubtitle: 'Подтягиваем треды с родителями и командой.',
  errorHeroSubtitle: 'Когда список снова откроется, здесь будут актуальные диалоги.',
  heroSubtitle:
    'Откройте тред одним нажатием — ответ, черновик и задачи в привычном потоке.',
  panelHint: 'Сузьте список по типу треда и сигналам.',
  quickTitle: 'Связанные разделы',
  quickHint: 'Те же маршруты, что на главной.',
  followUpTitle: 'Есть ответы от родителей',
  followUpText:
    'Откройте диалог и ответьте в треде. Задачу можно зафиксировать в переписке или в «Требуют внимания».',
  listSectionHint: 'Сначала ответы родителям и непрочитанное, далее — по списку.',
  errorHeading: 'Не удалось загрузить диалоги',
  errorBody:
    'Список временно недоступен — переписка на сервере сохранена. Повторите попытку чуть позже.',
  retryCta: COACH_DASHBOARD_COPY.retryCta,
  /** Summary when inbox is empty (buildSummaryLines). */
  summaryWhenEmpty:
    'Здесь появятся диалоги с родителями, командные треды и объявления — входящие вопросы и ответы в одном месте.',
  networkRetryHint: COACH_DASHBOARD_COPY.networkRetryHint,
} as const;

/**
 * Copy for coach player detail (`player/[id]/index`). No business logic.
 */

import { COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

export { COACH_AUTH_REQUIRED_LINE } from '@/lib/coachDashboardUi';

export const COACH_PLAYER_DETAIL_COPY = {
  heroEyebrow: 'Карточка игрока',
  loadingTitle: 'Загружаем карточку',
  loadingSubtitle: 'Профиль, посещаемость и контекст для решений.',
  quickHint:
    'Задача, диалог с родителем или голос — привычные маршруты без смены разделов.',
  quickFootnote:
    'Отдельного треда с родителем нет — откроем inbox. Когда появится диалог, кнопка ведёт в тред.',
  attentionIntro: 'Задачи из «Требуют внимания», отфильтрованные по этому игроку.',
  attentionQueueEmpty:
    'В очереди API по этому игроку сейчас нет записей. После сохранения задачи из диалога или голоса они появятся в общем списке.',
  snapshotIntro:
    'Краткий срез по наблюдениям и доступным метрикам — без выдуманных данных.',
  queueLoading: 'Загружаем очередь…',
  queueHintEmpty:
    'В центре «Требуют внимания» по этому игроку сейчас нет позиций.',
  queueHintOne: '1 задача в общей очереди тренера по этому игроку.',
  attendanceLoading: 'Загружаем…',
  notesLoading: 'Загружаем заметки…',
  activityEmpty: 'Нет недавней активности в локальных данных.',
  summaryPlaceholder:
    'Краткое резюме появится из заметок и наблюдений на тренировках.',
  /** Shared with dashboard / players list. */
  networkRetryHint: COACH_DASHBOARD_COPY.networkRetryHint,
  retryCta: COACH_DASHBOARD_COPY.retryCta,
} as const;

export function coachPlayerDetailQueueHintMany(n: number): string {
  return `${n} задач в очереди тренера по этому игроку.`;
}

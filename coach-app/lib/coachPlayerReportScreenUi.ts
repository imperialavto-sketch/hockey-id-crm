/**
 * Copy for coach player report detail (`player/[id]/report.tsx`). No business logic.
 */

import { COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

export { COACH_AUTH_REQUIRED_LINE } from '@/lib/coachDashboardUi';

export const COACH_PLAYER_REPORT_SCREEN_COPY = {
  loadingEyebrow: 'Отчёт',
  loadingTitle: 'Итог по игроку',
  loadingSubtitle: 'Подтягиваем сводку, наблюдения и рекомендации.',
  noIdTitle: 'Игрок не найден',
  noIdDescription: 'Откройте отчёт из карточки игрока или списка отчётов.',
  backCta: 'Назад',
  errorTitle: 'Сейчас не удалось открыть отчёт',
  loadErrorGeneric: 'Не удалось загрузить отчёт. Повторите попытку чуть позже.',
  networkRetryHint: COACH_DASHBOARD_COPY.networkRetryHint,
  retryCta: COACH_DASHBOARD_COPY.retryCta,
  emptyHeroEyebrow: 'Отчёт',
  emptyHeroTitle: 'Итог по игроку',
  emptyHeroSubtitle:
    'Когда данных достаточно, здесь появится сводка для разговора с игроком и родителями.',
  emptyTitle: 'Отчёт пока не готов',
  emptyDescription:
    'Обычно он появляется после наблюдений на тренировках. Проверьте позже или зафиксируйте новые данные.',
  emptyRefreshCta: 'Обновить',
  emptyToPlayerCta: 'К игроку',
  emptyMessagesCta: 'Сообщения',
  heroEyebrow: 'Отчёт',
  heroSubtitle:
    'Сводка по периоду: оценка, сильные стороны, зоны роста и рекомендации — в секциях ниже.',
  playerFallback: 'Игрок',
  metaNoObservations: 'Данные обновятся',
  quickNavTitle: 'Действия',
  quickNavHint: 'Карточка игрока, отправка родителю и входящие.',
  quickToPlayer: 'К игроку',
  quickShare: 'Отправка родителю',
  quickMessages: 'Сообщения',
  summaryKicker: 'Сводка',
  summaryDateFallbackNote:
    'Точная дата обновления с сервера не пришла — показан общий контекст периода.',
  execKicker: 'Резюме',
  execTitle: 'Коротко',
  assessmentKicker: 'Оценка',
  assessmentScorePrefix: 'Средний балл:',
  assessmentToneGood: 'Сильная динамика',
  assessmentToneStable: 'Стабильный уровень',
  assessmentToneAttention: 'Нужен фокус',
  strengthsKicker: 'Наблюдения',
  strengthsTitle: 'Сильные стороны',
  growthKicker: 'Фокус',
  growthTitle: 'Зоны роста',
  recKicker: 'Рекомендации',
  recTitle: 'Что делать дальше',
  obsKicker: 'Наблюдения',
  obsTitle: 'Записи по данным',
  obsNoBody: 'Без текста заметки',
  obsScorePrefix: 'балл',
  shareCta: 'Поделиться с родителем',
  shareHint: 'Откроется экран проверки текста перед отправкой в чат родителя.',
  metricScorePrefix: 'Балл:',
  metricSkillsFocus: 'Навыков в фокусе:',
} as const;

export function coachPlayerReportObsMoreLine(rest: number): string {
  const word = rest === 1 ? 'запись' : rest < 5 ? 'записи' : 'записей';
  return `И ещё ${rest} ${word}.`;
}

export function coachPlayerReportObservationCountLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} наблюдение`;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return `${n} наблюдения`;
  return `${n} наблюдений`;
}

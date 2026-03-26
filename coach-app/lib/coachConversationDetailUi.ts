/**
 * Copy for coach conversation detail (`conversation/[id]`). No business logic.
 */

import { COACH_AUTH_REQUIRED_LINE, COACH_DASHBOARD_COPY } from '@/lib/coachDashboardUi';

export { COACH_AUTH_REQUIRED_LINE };

export const COACH_CONVERSATION_DETAIL_COPY = {
  heroEyebrow: 'Входящие',
  loadingTitle: 'Загружаем диалог',
  loadingSubtitle: 'Переписка и пометки из inbox.',
  noIdTitle: 'Диалог не найден',
  noIdBody:
    'Ссылка могла устареть. Откройте диалог из списка сообщений или с карточки игрока.',
  loadErrorTitle: 'Не удалось открыть диалог',
  loadErrorFallback: 'Переписка на сервере сохранена.',
  retryCta: COACH_DASHBOARD_COPY.retryCta,
  toMessagesCta: 'К сообщениям',
  backCta: 'Назад',
  networkRetryHint: COACH_DASHBOARD_COPY.networkRetryHint,
  emptyMessagesTitle: 'Пока нет сообщений',
  emptyMessagesSub:
    'Напишите ниже — переписка появится здесь. Полный список тредов — во «Все сообщения» в шапке.',
  summaryKicker: 'Тред',
  taskBridgeKicker: 'Из переписки',
  taskBridgeTitle: 'Задача или черновик ответа',
  taskBridgeSubtitle:
    'Берём последнее сообщение родителя. Отправка в другие каналы — только после вашего сохранения.',
  taskBridgeTaskCta: 'Зафиксировать задачу',
  taskBridgeDraftCta: 'Подготовить ответ родителю',
  draftOriginTitle: 'Черновик в поле ввода',
  draftOriginSubtitle: 'Можно отредактировать перед отправкой — уйдёт в этот тред.',
  clearDraftCta: 'Убрать',
  sendSuccess: 'Сообщение отправлено',
  sendingCta: 'Отправляем…',
  sendCta: 'Отправить',
  sendFailedNetwork: 'Не удалось отправить — проверьте сеть и попробуйте снова.',
  sendFailedGeneric: 'Не удалось отправить — попробуйте ещё раз.',
  composerHintDefault: 'Введите сообщение и нажмите «Отправить».',
  composerHintTaskBridge: 'Ответьте ниже или используйте действия выше.',
  inputPlaceholder: 'Сообщение для треда…',
  quickAllMessages: 'Все сообщения',
  quickPlayerCard: 'Карточка игрока',
  quickDrafts: 'Черновики',
  lastIncomingLabel: 'Последнее входящее',
} as const;

/**
 * Coach Mark Proactive Nudges v1.
 * Локальное вычисление подсказок на основе notes, plans, calendar, playerId, chat.
 */

export type CoachMarkNudgeAction = "open_chat" | "open_player_chat";

export interface CoachMarkNudge {
  id: string;
  title: string;
  description: string;
  action: CoachMarkNudgeAction;
  playerId?: string;
}

export interface CoachMarkNudgeInput {
  notesCount: number;
  plansCount: number;
  calendarItemsCount: number;
  playerId?: string | null;
  hasRecentAIMessages: boolean;
}

/** Вычислить до 3 актуальных nudges. Локально, без сервера. */
export function computeCoachMarkNudges(input: CoachMarkNudgeInput): CoachMarkNudge[] {
  const nudges: CoachMarkNudge[] = [];

  // Нет playerId — совет открыть из профиля игрока
  if (!input.playerId) {
    nudges.push({
      id: "nudge-player-context",
      title: "Советы под вашего игрока",
      description: "Откройте Coach Mark из профиля игрока — он ответит с учётом возраста и уровня",
      action: "open_chat",
    });
  }

  // Нет заметок
  if (input.notesCount === 0 && nudges.length < 3) {
    nudges.push({
      id: "nudge-first-note",
      title: "Сохраните совет в заметки",
      description: "Долгое нажатие на ответ Coach Mark — сохранить в заметки для себя",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  // Нет недельного плана
  if (input.plansCount === 0 && nudges.length < 3) {
    nudges.push({
      id: "nudge-weekly-plan",
      title: "План на эту неделю",
      description: "Составьте план на эту неделю — Coach Mark подскажет, на что сделать упор",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  // Есть план, но нет calendar items
  if (input.plansCount > 0 && input.calendarItemsCount === 0 && nudges.length < 3) {
    nudges.push({
      id: "nudge-calendar-handoff",
      title: "Экспорт в календарь",
      description: "Перенесите план на эту неделю в календарь — в Hub нажмите «Подготовить для календаря»",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  // Нет недавнего общения с AI
  if (!input.hasRecentAIMessages && nudges.length < 3) {
    nudges.push({
      id: "nudge-ask-ai",
      title: "Спросите о развитии",
      description: "Задайте вопрос на этой неделе — Coach Mark подскажет следующий шаг",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  return nudges.slice(0, 3);
}

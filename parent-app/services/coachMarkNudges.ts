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
      title: "Персональные советы",
      description: "Откройте Coach Mark из профиля игрока для персональных советов",
      action: "open_chat",
    });
  }

  // Нет заметок
  if (input.notesCount === 0 && nudges.length < 3) {
    nudges.push({
      id: "nudge-first-note",
      title: "Сохраните первую заметку",
      description: "Сохраните ответ Coach Mark в заметки — long-press на сообщении",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  // Нет недельного плана
  if (input.plansCount === 0 && nudges.length < 3) {
    nudges.push({
      id: "nudge-weekly-plan",
      title: "Составьте недельный план",
      description: "Получите план развития на неделю от Coach Mark",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  // Есть план, но нет calendar items
  if (input.plansCount > 0 && input.calendarItemsCount === 0 && nudges.length < 3) {
    nudges.push({
      id: "nudge-calendar-handoff",
      title: "Подготовьте план для календаря",
      description: "Превратите недельный план в события для календаря",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  // Нет недавнего общения с AI
  if (!input.hasRecentAIMessages && nudges.length < 3) {
    nudges.push({
      id: "nudge-ask-ai",
      title: "Спросите Coach Mark",
      description: "Узнайте о слабых сторонах и зонах роста игрока",
      action: input.playerId ? "open_player_chat" : "open_chat",
      playerId: input.playerId ?? undefined,
    });
  }

  return nudges.slice(0, 3);
}

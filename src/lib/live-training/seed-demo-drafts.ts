/**
 * FALLBACK ONLY (PHASE 3+): демо-черновики, если при `finish` у сессии ещё нет ни одного draft.
 * Основной путь: события → `ingestLiveTrainingEventTx` → `LiveTrainingObservationDraft`.
 * Не удалять до полного покрытия empty-state / продуктового решения для «пустого» finish.
 */

import type { Prisma } from "@prisma/client";

export function buildDemoLiveTrainingDraftRows(
  sessionId: string
): Prisma.LiveTrainingObservationDraftCreateManyInput[] {
  const now = new Date();
  return [
    {
      sessionId,
      playerId: null,
      playerNameRaw: "Общее",
      sourceText:
        "Временные демо-данные: сюда попадут реальные наблюдения после подключения стрима и разбора речи.",
      category: "общее",
      sentiment: "neutral",
      confidence: null,
      needsReview: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      sessionId,
      playerId: null,
      playerNameRaw: "Игрок (пример)",
      sourceText: "Положительная работа ног в поворотах.",
      category: "катание",
      sentiment: "positive",
      confidence: 0.78,
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      sessionId,
      playerId: null,
      playerNameRaw: "Игрок (пример)",
      sourceText: "Требует уточнения: неуверенный приём паса слева.",
      category: "техника",
      sentiment: "negative",
      confidence: 0.42,
      needsReview: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

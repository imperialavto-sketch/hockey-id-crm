/**
 * Canonical Arena action labels mirrored from parent-app (no cross-package import).
 * Sources of truth in UI:
 * - `parent-app/lib/arenaWeeklyInsight.ts` → `deriveArenaInsightFollowUps` (labels)
 * - `parent-app/app/chat/[id].tsx` → `COACH_MARK_STARTERS`, primary/secondary scenarios (labels)
 *
 * Used only to steer LLM wording toward the same phrases users see on chips.
 */

/** Follow-up insight chips (conditional in UI; list is the union of all labels). */
export const ARENA_FOLLOW_UP_CHIP_LABELS = [
  "Разобрать тренировку",
  "Как помочь дома",
  "Что это значит для роста",
  "С чего начать",
  "Как помочь ребёнку",
] as const;

/** Starter row + primary/secondary scenario chips in Arena chat header / empty state. */
export const ARENA_STARTER_AND_SCENARIO_LABELS = [
  "Фокус на неделю",
  "Бросок: с чего начать",
  "План на 7 дней",
  "Перед важной игрой",
  "Последняя тренировка",
  "Что важнее всего",
  "10–15 мин дома",
  "Отчёт тренера проще",
  "Есть ли прогресс?",
  "Как поддержать сейчас",
] as const;

/**
 * Compact block appended to the Arena system prompt — allowed action vocabulary.
 */
export function buildArenaCanonicalActionVocabularyForPrompt(): string {
  const followUps = ARENA_FOLLOW_UP_CHIP_LABELS.join(", ");
  const starters = ARENA_STARTER_AND_SCENARIO_LABELS.join(", ");
  return [
    "СЛОВАРЬ ДЕЙСТВИЙ (как подписи чипов в приложении — используй эти формулировки, когда называешь тип шага или сценария; не выдумывай новые «бренды» действий):",
    `• Чипы follow-up: ${followUps}.`,
    `• Стартеры и сценарии: ${starters}.`,
    "В «Что делать дальше» — только ОДНО действие; без списков и без «или/вариант». По желанию в конце можно намекнуть на одну подпись чипа из словаря (например «Как помочь дома»), но не перечислять несколько.",
  ].join("\n");
}

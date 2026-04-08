/**
 * Человекочитаемые подписи для `coachDecision` на экране review (Arena).
 */

import type { LiveTrainingArenaCoachReviewCategory } from "@/types/liveTraining";

export function coachReviewCategoryLabelRu(
  category: LiveTrainingArenaCoachReviewCategory | undefined
): string | null {
  if (!category || category === "neutral") return null;
  switch (category) {
    case "mistake":
      return "Ошибка";
    case "success":
      return "Успех";
    case "behavior":
      return "Поведение";
    case "unclear":
      return "Нужно уточнение";
    case "clarification":
      return "Уточнение";
    default:
      return null;
  }
}

/** Коды с сервера (`coachAttentionReasons`) → короткий текст; неизвестные не показываем. */
export function coachAttentionReasonLabelRu(code: string): string | null {
  switch (code) {
    case "draft_flagged_needs_review":
      return "Требует проверки";
    case "interpretation_uncertain":
      return "Арена не уверена";
    case "repeated_concern_same_player_session":
      return "Повторяется у игрока";
    case "behavioral_negative":
      return "Поведенческий момент";
    case "clarification_queue":
      return "Нужно уточнение";
    case "domain_unclear":
      return "Тема неясна";
    default:
      break;
  }
  if (code.startsWith("mistake_confidence_")) {
    if (code.endsWith("high")) return "Сильный акцент на ошибке";
    if (code.endsWith("medium")) return "Возможная ошибка";
    return "Слабый сигнал ошибки";
  }
  return null;
}

/** До `max` подсказок, порядок как в ответе API. */
export function pickCoachAttentionHintLines(reasons: string[] | undefined, max: number): string[] {
  if (!reasons?.length || max <= 0) return [];
  const out: string[] = [];
  for (const r of reasons) {
    const line = coachAttentionReasonLabelRu(r);
    if (line && !out.includes(line)) out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

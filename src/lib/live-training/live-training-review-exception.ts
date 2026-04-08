/**
 * PHASE 6: exceptions-first review — в очереди проверки только то, что требует внимания тренера.
 * Остальные черновики считаются авто-принятыми для целей UI (данные в БД не меняются).
 */

/** Ниже порога — показываем в review, даже если ingest не выставил needsReview. */
export const LIVE_TRAINING_REVIEW_MIN_CONFIDENCE = 0.45;

export type DraftLikeForReviewException = {
  playerId: string | null;
  needsReview: boolean;
  confidence: number | null;
  coachDecision?: {
    requiresCoachReview?: boolean;
    coachAttentionReasons?: string[];
  } | null;
};

/**
 * Наблюдение попадает в список «требуют внимания», если:
 * - не назначен игрок;
 * - ingest пометил needsReview (неоднозначность / без игрока);
 * - низкая уверенность парсера;
 * - интерпретация Arena / повторы в сессии требуют взгляда тренера (`requiresCoachReview`);
 * - в причинах явно отмечена политика (если появится в reasons).
 */
export function isLiveTrainingDraftReviewException(d: DraftLikeForReviewException): boolean {
  if (!d.playerId?.trim()) return true;
  if (d.needsReview) return true;
  if (
    typeof d.confidence === "number" &&
    Number.isFinite(d.confidence) &&
    d.confidence < LIVE_TRAINING_REVIEW_MIN_CONFIDENCE
  ) {
    return true;
  }
  const cd = d.coachDecision;
  if (cd?.requiresCoachReview) return true;
  if (cd?.coachAttentionReasons?.some((r) => r.toLowerCase().includes("policy"))) return true;
  return false;
}

export type LiveTrainingReviewListScope = "exceptions" | "all";

export function filterDraftsByReviewListScope<T extends DraftLikeForReviewException>(
  drafts: T[],
  scope: LiveTrainingReviewListScope
): T[] {
  if (scope === "all") return drafts;
  return drafts.filter(isLiveTrainingDraftReviewException);
}

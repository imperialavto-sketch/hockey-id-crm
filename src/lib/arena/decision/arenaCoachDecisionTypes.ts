/**
 * Coach-facing review semantics (decision support, не рекомендации продукта).
 */

export type ArenaCoachReviewCategory =
  | "clarification"
  | "mistake"
  | "behavior"
  | "success"
  | "neutral"
  | "unclear";

export type ArenaCoachReviewPriority = "high" | "medium" | "low";

export type ArenaCoachDecisionDto = {
  requiresCoachReview: boolean;
  reviewCategory: ArenaCoachReviewCategory;
  reviewPriority: ArenaCoachReviewPriority;
  coachAttentionReasons: string[];
  /** Два и более «тревожных» черновика по тому же игроку в сессии. */
  repeatedConcernInSession?: boolean;
};

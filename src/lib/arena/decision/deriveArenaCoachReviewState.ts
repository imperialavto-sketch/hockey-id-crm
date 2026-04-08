/**
 * Единый детерминированный слой: флаги черновика + Arena interpretation → семантика review для тренера.
 */

import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";
import type {
  ArenaCoachDecisionDto,
  ArenaCoachReviewCategory,
  ArenaCoachReviewPriority,
} from "./arenaCoachDecisionTypes";

export type ArenaCoachDecisionDraftSnapshot = {
  id: string;
  needsReview: boolean;
  playerId: string | null;
  interpretation?: ArenaObservationInterpretation | null;
};

function isConcernPeer(p: ArenaCoachDecisionDraftSnapshot): boolean {
  if (p.needsReview) return true;
  const i = p.interpretation;
  if (!i) return false;
  if (i.signalKind === "mistake") return true;
  if (i.domain === "behavioral" && i.direction === "negative") return true;
  if (i.domain === "unclear" && i.needsReview) return true;
  if (i.signalKind === "neutral_observation" && i.direction === "negative") return true;
  return false;
}

function repeatedConcernForPlayer(
  draft: ArenaCoachDecisionDraftSnapshot,
  sessionPeers: readonly ArenaCoachDecisionDraftSnapshot[]
): boolean {
  const pid = draft.playerId?.trim();
  if (!pid) return false;
  const same = sessionPeers.filter((p) => p.playerId?.trim() === pid);
  const concernCount = same.filter(isConcernPeer).length;
  return concernCount >= 2;
}

function pickCategory(
  draft: ArenaCoachDecisionDraftSnapshot,
  i: ArenaObservationInterpretation | null | undefined
): ArenaCoachReviewCategory {
  if (draft.needsReview) return "clarification";
  if (!i) return "neutral";
  if (i.domain === "unclear") return "unclear";
  if (i.signalKind === "mistake") return "mistake";
  if (i.signalKind === "success") return "success";
  if (i.domain === "behavioral") return "behavior";
  return "neutral";
}

function pickPriority(params: {
  draft: ArenaCoachDecisionDraftSnapshot;
  i: ArenaObservationInterpretation | null | undefined;
  category: ArenaCoachReviewCategory;
  requiresCoachReview: boolean;
  repeatedConcern: boolean;
}): ArenaCoachReviewPriority {
  const { draft, i, category, requiresCoachReview, repeatedConcern } = params;

  if (draft.needsReview) return "high";
  if (repeatedConcern) return "high";

  if (category === "clarification") return "high";

  if (i && i.domain === "behavioral" && i.direction === "negative") {
    return "high";
  }

  if (category === "mistake" && i) {
    if (i.confidence === "high") return "high";
    if (i.confidence === "medium") return "medium";
    return "medium";
  }

  if (category === "unclear" || (i?.needsReview && i.domain === "unclear")) {
    return requiresCoachReview ? "high" : "medium";
  }

  if (i?.needsReview) return "medium";

  if (category === "success" && i?.confidence === "high" && !draft.needsReview) {
    return "low";
  }

  if (category === "success") return "low";

  if (category === "neutral" && !i) return "low";

  return "medium";
}

function collectReasons(params: {
  draft: ArenaCoachDecisionDraftSnapshot;
  i: ArenaObservationInterpretation | null | undefined;
  category: ArenaCoachReviewCategory;
  requiresCoachReview: boolean;
  repeatedConcern: boolean;
}): string[] {
  const reasons: string[] = [];
  const { draft, i, category, requiresCoachReview, repeatedConcern } = params;
  if (draft.needsReview) reasons.push("draft_flagged_needs_review");
  if (i?.needsReview) reasons.push("interpretation_uncertain");
  if (repeatedConcern) reasons.push("repeated_concern_same_player_session");
  if (category === "clarification") reasons.push("clarification_queue");
  if (category === "mistake" && i) reasons.push(`mistake_confidence_${i.confidence}`);
  if (i && i.domain === "behavioral" && i.direction === "negative") {
    reasons.push("behavioral_negative");
  }
  if (category === "unclear") reasons.push("domain_unclear");
  return [...new Set(reasons)];
}

/**
 * Объединяет `draft.needsReview` и `interpretation.needsReview` в одну семантику для тренера.
 */
export function deriveArenaCoachReviewState(
  draft: ArenaCoachDecisionDraftSnapshot,
  sessionPeers: readonly ArenaCoachDecisionDraftSnapshot[]
): ArenaCoachDecisionDto {
  const i = draft.interpretation ?? null;
  const repeatedConcern = repeatedConcernForPlayer(draft, sessionPeers);

  const requiresCoachReview =
    draft.needsReview || Boolean(i?.needsReview) || repeatedConcern;

  const reviewCategory = pickCategory(draft, i);

  const reviewPriority = pickPriority({
    draft,
    i,
    category: reviewCategory,
    requiresCoachReview,
    repeatedConcern,
  });

  const coachAttentionReasons = collectReasons({
    draft,
    i,
    category: reviewCategory,
    requiresCoachReview,
    repeatedConcern,
  });

  const out: ArenaCoachDecisionDto = {
    requiresCoachReview,
    reviewCategory,
    reviewPriority,
    coachAttentionReasons,
  };
  if (repeatedConcern) out.repeatedConcernInSession = true;
  return out;
}

/** Числовой ранг для сортировки (больше = раньше в списке проверки). */
export function arenaCoachReviewSortRank(d: ArenaCoachDecisionDto): number {
  let tier = 0;
  switch (d.reviewCategory) {
    case "clarification":
      tier = 600;
      break;
    case "unclear":
      tier = 320;
      break;
    case "behavior":
      tier = d.coachAttentionReasons.includes("behavioral_negative") ? 520 : 260;
      break;
    case "mistake":
      tier = 450;
      break;
    case "neutral":
      tier = 200;
      break;
    case "success":
      tier = 100;
      break;
    default:
      tier = 0;
  }

  const pri =
    d.reviewPriority === "high" ? 30 : d.reviewPriority === "medium" ? 20 : 10;
  const repeat = d.repeatedConcernInSession ? 15 : 0;
  const req = d.requiresCoachReview ? 25 : 0;
  return tier + pri + repeat + req;
}

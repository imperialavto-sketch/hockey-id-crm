/**
 * Родительский слой объяснений Arena: только человекочитаемый текст, без рекомендаций и CRM-логики.
 */

import type { ArenaCoachDecisionDto } from "@/lib/arena/decision/arenaCoachDecisionTypes";
import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";

export type ArenaParentExplanation = {
  explanation: string;
  meaning: string;
  /** Только при высоком приоритете review или повторе в сессии. */
  attention?: string;
};

export type BuildArenaParentExplanationInput = {
  interpretation: ArenaObservationInterpretation;
  coachDecision?: ArenaCoachDecisionDto | null;
};

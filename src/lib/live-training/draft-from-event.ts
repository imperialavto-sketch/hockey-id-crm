/**
 * Построение черновика наблюдения из события + результата матчинга.
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { LiveTrainingPlayerMatchResult } from "./match-player";

const DEFAULT_CATEGORY = "general_observation";
const DEFAULT_SENTIMENT: LiveTrainingObservationSentiment = "neutral";

function draftNeedsReview(match: LiveTrainingPlayerMatchResult): boolean {
  return match.kind === "unresolved" || match.kind === "ambiguous";
}

export function buildDraftFromLiveTrainingEvent(params: {
  sessionId: string;
  normalizedSourceText: string;
  match: LiveTrainingPlayerMatchResult;
  inputPlayerNameRaw: string | null;
  category: string | null | undefined;
  sentiment: LiveTrainingObservationSentiment | null | undefined;
  confidence: number | null | undefined;
  /** PHASE 22: снимок contextAssistant для review UI. */
  ingestProvenanceJson?: Prisma.InputJsonValue | null;
}): Prisma.LiveTrainingObservationDraftUncheckedCreateInput {
  const sentiment = params.sentiment ?? DEFAULT_SENTIMENT;
  const category =
    typeof params.category === "string" && params.category.trim()
      ? params.category.trim()
      : DEFAULT_CATEGORY;

  let playerId: string | null = null;
  let playerNameRaw: string | null = null;

  if (params.match.kind === "resolved") {
    playerId = params.match.playerId;
    playerNameRaw = params.match.displayName;
  } else if (params.match.kind === "skipped") {
    playerId = null;
    playerNameRaw = null;
  } else {
    playerId = null;
    playerNameRaw = params.inputPlayerNameRaw?.trim() || null;
  }

  const base: Prisma.LiveTrainingObservationDraftUncheckedCreateInput = {
    sessionId: params.sessionId,
    playerId,
    playerNameRaw,
    sourceText: params.normalizedSourceText,
    category,
    sentiment,
    confidence: params.confidence ?? null,
    needsReview: draftNeedsReview(params.match),
  };
  if (params.ingestProvenanceJson != null) {
    base.ingestProvenanceJson = params.ingestProvenanceJson;
  }
  return base;
}

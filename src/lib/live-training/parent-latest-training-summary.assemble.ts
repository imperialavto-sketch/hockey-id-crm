/**
 * Server-side assembly pipeline for `GET /api/parent/players/[id]/latest-training-summary`.
 *
 * Merge order (same behavior as pre-pass-6, structured explicitly):
 *
 * 1. **Canonical / legacy base** (exactly one path):
 *    - `buildPublishedParentLatestTrainingSummaryPayload` — `TrainingSessionReport` + привязка к live + meaning + arena drafts.
 *    - else `buildLiveSessionFallbackParentLatestTrainingSummaryPayload` — последняя live-сессия + draft/meaning/continuity + arena drafts.
 *
 * 2. **Supercore layer** — `applySupercoreLayerToParentLatestTrainingSummary`:
 *    - `ArenaCoreFacts` + `ArenaCoreBindings` для той же `liveTrainingSessionId` (или пропуск, если id нет / фактов нет).
 *    - Structural: `trainingSessionId` из `canonical.linkedTrainingSessionId`, если legacy опустил.
 *    - Fallback-only: decisions → `developmentFocus` / placeholder `shortSummary`; parent explanations → `supportNotes`.
 *
 * DTO shape unchanged; published branch не получает fallback-only supercore merges (логика в normalize).
 */

import type { ParentLatestLiveTrainingSummaryDto } from "./parent-latest-live-training-summary";
import {
  buildLiveSessionFallbackParentLatestTrainingSummaryPayload,
  buildPublishedParentLatestTrainingSummaryPayload,
} from "./parent-latest-live-training-summary";
import { applySupercoreLayerToParentLatestTrainingSummary } from "./parent-latest-summary-arena-supercore.normalize";

export async function buildParentLatestTrainingSummaryFromSources(
  playerId: string
): Promise<ParentLatestLiveTrainingSummaryDto> {
  const published = await buildPublishedParentLatestTrainingSummaryPayload(playerId);
  if (published) {
    return applySupercoreLayerToParentLatestTrainingSummary({
      basePayload: published.payload,
      liveTrainingSessionId: published.liveTrainingSessionId,
    });
  }

  const fallback = await buildLiveSessionFallbackParentLatestTrainingSummaryPayload(playerId);
  if (!fallback.payload.hasData) {
    return fallback.payload;
  }

  return applySupercoreLayerToParentLatestTrainingSummary({
    basePayload: fallback.payload,
    liveTrainingSessionId: fallback.liveTrainingSessionId,
  });
}

/** Стабильное имя для route и внешних вызовов (= `buildParentLatestTrainingSummaryFromSources`). */
export async function getParentLatestLiveTrainingSummaryForPlayer(
  playerId: string
): Promise<ParentLatestLiveTrainingSummaryDto> {
  return buildParentLatestTrainingSummaryFromSources(playerId);
}

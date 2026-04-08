/**
 * Локальная сборка pipeline для post-session Arena review (без API).
 * Те же шаги, что на dev prototype: split → multi-intent → resolution → review items.
 */

import { resolveArenaIntentCandidatesV1 } from "@/dev/arena-candidate-resolution-v1";
import { MULTI_INTENT_AUDIT_ROSTER, parseArenaMultiIntentPrototype } from "@/dev/arena-multi-intent-adapter-v1";
import { resolutionResultToReviewItems } from "@/dev/arena-review-items-adapter-v1";
import { splitArenaObservations } from "@/dev/split-arena-observations-v1";

export function runArenaReviewLocalPipeline(transcript: string) {
  const roster = MULTI_INTENT_AUDIT_ROSTER;
  const segments = splitArenaObservations({ transcript });
  const candidates = parseArenaMultiIntentPrototype({ transcript, roster });
  const resolution = resolveArenaIntentCandidatesV1({ transcript, candidates });
  const reviewItems = resolutionResultToReviewItems({
    resolution,
    candidates,
    roster,
    originalTranscript: transcript,
  });
  return {
    segmentsCount: segments.length,
    candidatesCount: candidates.length,
    resolution,
    reviewItems,
  };
}

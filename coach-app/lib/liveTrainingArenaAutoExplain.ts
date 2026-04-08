/**
 * PHASE 6 Step 10: короткое объяснение для тренера после авто-finalize (без перегруза, max 5 строк).
 */

import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import type { LiveTrainingCoachView, LiveTrainingPriorityAlignmentReview } from "@/types/liveTraining";

const MAX_LINES = 5;

/**
 * Формирует 3–5 строк: факты (счётчик, темы, фокус) + короткие «потому что» по доступным сигналам.
 */
export function buildLiveTrainingArenaAutoExplainLines(params: {
  coachView: LiveTrainingCoachView;
  priorityAlignmentReview?: LiveTrainingPriorityAlignmentReview | null;
}): string[] {
  const { counters, focusDomains, players } = params.coachView;
  const out: string[] = [];

  out.push(`Наблюдений принято автоматически: ${counters.includedDraftsCount}.`);

  if (focusDomains.length > 0) {
    const doms = focusDomains
      .slice(0, 3)
      .map((d) => formatLiveTrainingMetricDomain(d))
      .join(" · ");
    out.push(`Выделены темы: ${doms}.`);
  }

  const topPlayers = [...players]
    .filter((p) => p.totalSignals > 0)
    .sort((a, b) => b.totalSignals - a.totalSignals)
    .slice(0, 3)
    .map((p) => p.playerName.trim())
    .filter(Boolean);
  if (topPlayers.length > 0) {
    out.push(`В фокусе по сигналам: ${topPlayers.join(", ")}.`);
  }

  const par = params.priorityAlignmentReview;
  const why: string[] = [];
  if (par?.evaluationApplied && (par.alignmentBand === "strong" || par.alignmentBand === "partial")) {
    why.push("Потому что итог перекликается с планом старта.");
  }
  if (counters.draftsFlaggedNeedsReview === 0 && counters.includedDraftsCount > 0) {
    why.push("Потому что сработала высокая уверенность и не было очереди исключений.");
  }
  why.push("Потому что повторы внутри сессии Арена уже согласовала между наблюдениями.");

  for (const w of why) {
    if (out.length >= MAX_LINES) break;
    out.push(w);
  }

  return out.slice(0, MAX_LINES);
}

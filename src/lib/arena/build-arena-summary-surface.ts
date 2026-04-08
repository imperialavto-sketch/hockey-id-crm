import { buildPlayerDevelopmentOverview } from "@/lib/arena/build-player-development-overview";
import { buildExternalDevelopmentNarrative } from "@/lib/arena/build-external-development-narrative";
import {
  buildExternalFollowUpRecommendation,
  type ExternalFollowUpRecommendationView,
} from "@/lib/arena/build-external-follow-up-recommendation";
import type { PlayerDevelopmentOverview } from "@/lib/arena/build-player-development-overview";

export type ArenaSummarySurfaceView = {
  title: string;
  stateLabel: string;
  stateTone: "active" | "calm" | "watchful";
  summary: string;
  nextStepLabel: string | null;
  explanationPoints: string[];
};

const SUMMARY_MERGE_MAX = 260;

function mergeOverviewAndFollowSummaries(overviewSummary: string, followSummary: string): string {
  const a = overviewSummary.trim();
  const b = followSummary.trim();
  if (!b) return a;
  if (!a) return b;
  const combined = `${a} ${b}`;
  if (combined.length <= SUMMARY_MERGE_MAX) return combined;
  const cut = combined.slice(0, SUMMARY_MERGE_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > 48 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${base}…`;
}

function dedupePush(points: string[], seen: Set<string>, line: string) {
  const k = line.trim();
  if (!k || seen.has(k)) return;
  seen.add(k);
  points.push(k);
}

/** 2–3 пункта: приоритет follow-up, затем overview, без дублей. */
function pickMergedExplanationPoints(overviewPts: string[], followPts: string[], max = 3): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of followPts) {
    if (out.length >= max) break;
    dedupePush(out, seen, s);
  }
  for (const s of overviewPts) {
    if (out.length >= max) break;
    dedupePush(out, seen, s);
  }
  return out.slice(0, max);
}

function stateToneForFollowUp(follow: ExternalFollowUpRecommendationView): "active" | "calm" {
  const hasAction = follow.actionLabel != null && follow.actionLabel.trim().length > 0;
  if (follow.type === "follow_up_training" && hasAction) return "active";
  return "calm";
}

function stateToneFromOverviewPhase(
  phase: PlayerDevelopmentOverview["phase"],
  externalContour: boolean
): "active" | "calm" | "watchful" {
  if (phase === "passive") return "watchful";
  if (phase === "consolidation") return "calm";
  // active_focus
  return externalContour ? "active" : "watchful";
}

/**
 * Единая верхняя сводка Арены для родителя: только композиция уже посчитанных overview / narrative / follow-up.
 */
export async function buildArenaSummarySurface(params: {
  playerId: string;
  parentId: string;
}): Promise<ArenaSummarySurfaceView> {
  const playerId = params.playerId.trim();
  const parentId = params.parentId.trim();

  const [overview, narrative, followUp] = await Promise.all([
    buildPlayerDevelopmentOverview({ playerId, parentId }),
    buildExternalDevelopmentNarrative({ playerId, parentId }),
    buildExternalFollowUpRecommendation({ playerId, parentId }),
  ]);

  const hasExternalContour = narrative != null;

  if (followUp) {
    const stateLabel = followUp.phaseLabel?.trim() || overview.phaseLabel;
    const summary = mergeOverviewAndFollowSummaries(overview.summary, followUp.summary);
    const nextStepLabel =
      followUp.actionLabel != null && followUp.actionLabel.trim().length > 0
        ? followUp.actionLabel.trim()
        : null;
    const explanationPoints = pickMergedExplanationPoints(
      overview.explanationPoints,
      followUp.explanationPoints
    );
    const stateTone = stateToneForFollowUp(followUp);

    return {
      title: "Арена ведёт развитие игрока",
      stateLabel,
      stateTone,
      summary,
      nextStepLabel,
      explanationPoints,
    };
  }

  if (hasExternalContour) {
    const stateTone = stateToneFromOverviewPhase(overview.phase, true);
    return {
      title: "Арена ведёт текущее состояние развития",
      stateLabel: overview.phaseLabel,
      stateTone,
      summary: overview.summary,
      nextStepLabel: null,
      explanationPoints: overview.explanationPoints.slice(0, 3),
    };
  }

  const stateTone = stateToneFromOverviewPhase(overview.phase, false);

  return {
    title: "Арена наблюдает развитие игрока",
    stateLabel: overview.phaseLabel,
    stateTone,
    summary: overview.summary,
    nextStepLabel: null,
    explanationPoints: overview.explanationPoints.slice(0, 3),
  };
}

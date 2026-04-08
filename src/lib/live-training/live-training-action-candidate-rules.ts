/**
 * Rule-based маппинг доменов → тип действия (прозрачные правила PHASE 15).
 */

import type {
  LiveTrainingActionCandidateDto,
  LiveTrainingActionCandidateType,
} from "./live-training-action-candidate-types";

const TECH_DOMAINS = new Set(["ofp", "skating", "shooting", "puck_control", "pace"]);

export function domainToActionType(domain: string): LiveTrainingActionCandidateType {
  if (domain === "workrate") return "monitor_effort";
  if (TECH_DOMAINS.has(domain)) return "monitor_technique";
  return "monitor_attention";
}

export function priorityRank(p: "high" | "medium" | "low"): number {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

function toneRank(t: LiveTrainingActionCandidateDto["tone"]): number {
  if (t === "attention") return 2;
  if (t === "positive") return 1;
  return 0;
}

export function sortLiveTrainingActionCandidates(
  items: LiveTrainingActionCandidateDto[],
  limit: number
): LiveTrainingActionCandidateDto[] {
  return [...items]
    .sort((a, b) => {
      const pr = priorityRank(b.priority) - priorityRank(a.priority);
      if (pr !== 0) return pr;
      return toneRank(b.tone) - toneRank(a.tone);
    })
    .slice(0, limit);
}

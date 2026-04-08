/**
 * Dev-only: итоговый снимок review после локальных решений тренера.
 * Без API, без production.
 */

import type { ArenaReviewListItem } from "./arena-review-items-adapter-v1";

export type ArenaCoachReviewDecision =
  | "confirm"
  | "merge"
  | "keep_separate"
  | "assign_player"
  | "convert_team"
  | "keep_note"
  | "discard";

export type ArenaCoachReviewDecisionMap = Record<string, ArenaCoachReviewDecision | undefined>;

export type ArenaReviewDecisionOutput = {
  transcript: string;
  summary: {
    totalItems: number;
    decisionsMade: number;
    unresolvedCount: number;
    confirmedCount: number;
    mergedCount: number;
    keptSeparateCount: number;
    assignedPlayerCount: number;
    convertedTeamCount: number;
    keptNoteCount: number;
    discardedCount: number;
  };
  items: Array<{
    id: string;
    resolutionKind: string;
    segmentText: string;
    /** Ключ решения; отсутствует = unresolved */
    decision?: string;
    unresolved: boolean;
    playerLabel?: string | null;
    sentiment?: string;
    reason?: string;
  }>;
};

const emptySummary = (): ArenaReviewDecisionOutput["summary"] => ({
  totalItems: 0,
  decisionsMade: 0,
  unresolvedCount: 0,
  confirmedCount: 0,
  mergedCount: 0,
  keptSeparateCount: 0,
  assignedPlayerCount: 0,
  convertedTeamCount: 0,
  keptNoteCount: 0,
  discardedCount: 0,
});

export function buildArenaReviewDecisionOutput(input: {
  transcript: string;
  reviewItems: ArenaReviewListItem[];
  decisionMap: ArenaCoachReviewDecisionMap;
}): ArenaReviewDecisionOutput {
  const { transcript, reviewItems, decisionMap } = input;
  const summary = emptySummary();
  summary.totalItems = reviewItems.length;

  const items: ArenaReviewDecisionOutput["items"] = [];

  for (const ri of reviewItems) {
    const d = decisionMap[ri.id];
    const unresolved = d === undefined;
    if (!unresolved) {
      summary.decisionsMade += 1;
      switch (d) {
        case "confirm":
          summary.confirmedCount += 1;
          break;
        case "merge":
          summary.mergedCount += 1;
          break;
        case "keep_separate":
          summary.keptSeparateCount += 1;
          break;
        case "assign_player":
          summary.assignedPlayerCount += 1;
          break;
        case "convert_team":
          summary.convertedTeamCount += 1;
          break;
        case "keep_note":
          summary.keptNoteCount += 1;
          break;
        case "discard":
          summary.discardedCount += 1;
          break;
        default:
          break;
      }
    } else {
      summary.unresolvedCount += 1;
    }

    items.push({
      id: ri.id,
      resolutionKind: ri.resolutionKind,
      segmentText: ri.segmentText,
      decision: unresolved ? undefined : d,
      unresolved,
      playerLabel: ri.playerLabel ?? null,
      sentiment: ri.sentiment,
      reason: ri.reason,
    });
  }

  return { transcript, summary, items };
}

/** Короткие строки для человекочитаемого блока на экране */
export function formatArenaReviewHumanSummary(output: ArenaReviewDecisionOutput): string[] {
  const s = output.summary;
  const lines: string[] = [
    `всего карточек: ${s.totalItems}`,
    `с решением: ${s.decisionsMade}`,
    `нужно доработать (нет выбора): ${s.unresolvedCount}`,
  ];
  const add = (label: string, n: number) => {
    if (n > 0) lines.push(`${label}: ${n}`);
  };
  add("подтверждено", s.confirmedCount);
  add("объединить", s.mergedCount);
  add("два отдельных", s.keptSeparateCount);
  add("назначить игрока", s.assignedPlayerCount);
  add("как команда", s.convertedTeamCount);
  add("заметка", s.keptNoteCount);
  add("не сохранять", s.discardedCount);
  return lines;
}

export function arenaReviewDecisionOutputToJson(output: ArenaReviewDecisionOutput): string {
  return JSON.stringify(output, null, 2);
}

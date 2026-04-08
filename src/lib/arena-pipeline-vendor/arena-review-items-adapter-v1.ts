/**
 * Dev-only: ArenaResolutionResult → плоский список элементов для review UI.
 * Не подключать к production flow.
 */

import type { ArenaIntent } from "./parse-arena-intent";
import { detectArenaSentiment, normalizeArenaText } from "./arena-sentiment";
import type { ArenaIntentCandidate } from "./arena-multi-intent-adapter-v1";
import type { ArenaResolutionResult, ArenaResolvedCandidate } from "./arena-candidate-resolution-v1";

export type ArenaReviewSection =
  | "READY_TO_KEEP"
  | "NEEDS_MERGE_REVIEW"
  | "NEEDS_ATTENTION";

/** Shape из docs/arena-multi-observation-review-v1.md + section + suggestedActionLabels */
export type ArenaReviewListItem = {
  id: string;
  section: ArenaReviewSection;
  resolutionKind: "keep" | "merge" | "ambiguous";
  segmentText: string;
  intentKind: "create_player_observation" | "create_team_observation" | "unknown";
  playerId?: string | null;
  playerLabel?: string | null;
  sentiment?: "positive" | "neutral" | "negative";
  reason?: string;
  sourceIndexes?: number[];
  mergedIntoIndex?: number;
  secondarySegmentText?: string;
  /** Стабильный порядок следования (глобальный, по мере появления в resolution) */
  order: number;
  suggestedActionLabels: string[];
  segmentIndex?: number;
  originalTranscript?: string;
};

export type ArenaReviewItemsAdapterInput = {
  resolution: ArenaResolutionResult;
  candidates: ArenaIntentCandidate[];
  /** Для подписи игрока */
  roster?: { id: string; name: string }[];
  originalTranscript?: string;
};

function rosterLabel(playerId: string | null | undefined, roster?: { id: string; name: string }[]): string | null {
  if (!playerId) return null;
  const hit = roster?.find((r) => r.id === playerId);
  return hit?.name ?? playerId;
}

function subjectLabel(
  intent: ArenaIntent,
  roster?: { id: string; name: string }[]
): { intentKind: ArenaReviewListItem["intentKind"]; playerId: string | null; playerLabel: string | null } {
  if (intent.kind === "create_player_observation") {
    const pid = intent.playerId;
    return {
      intentKind: "create_player_observation",
      playerId: pid,
      playerLabel: rosterLabel(pid, roster),
    };
  }
  if (intent.kind === "create_team_observation") {
    return { intentKind: "create_team_observation", playerId: null, playerLabel: "Команда" };
  }
  return { intentKind: "unknown", playerId: null, playerLabel: "Без привязки" };
}

function sentimentForIntent(intent: ArenaIntent, segmentText: string): "positive" | "neutral" | "negative" | undefined {
  if (intent.kind === "unknown") {
    return detectArenaSentiment(normalizeArenaText(segmentText));
  }
  return intent.sentiment ?? "neutral";
}

function sectionForKind(kind: ArenaResolvedCandidate["kind"]): ArenaReviewSection {
  if (kind === "keep") return "READY_TO_KEEP";
  if (kind === "merge") return "NEEDS_MERGE_REVIEW";
  return "NEEDS_ATTENTION";
}

const SUGGESTED = {
  keep: ["Подтвердить как есть"],
  merge: ["Объединить в одно наблюдение", "Оставить как два отдельных"],
  ambiguous: ["Назначить игрока", "Как оценка команды", "Оставить как заметку", "Не сохранять"],
} as const;

/**
 * Преобразует результат resolution в элементы review list с стабильным `order`.
 */
export function resolutionResultToReviewItems(input: ArenaReviewItemsAdapterInput): ArenaReviewListItem[] {
  const { resolution, candidates, roster, originalTranscript } = input;
  const out: ArenaReviewListItem[] = [];
  let order = 0;

  for (const item of resolution.items) {
    if (item.kind === "keep") {
      const c = item.candidate;
      const subj = subjectLabel(c.intent, roster);
      out.push({
        id: `review-keep-${c.segmentIndex}-${order}`,
        section: sectionForKind("keep"),
        resolutionKind: "keep",
        segmentText: c.segmentText,
        intentKind: subj.intentKind,
        playerId: subj.playerId,
        playerLabel: subj.playerLabel,
        sentiment: sentimentForIntent(c.intent, c.segmentText),
        reason: item.reason,
        order,
        suggestedActionLabels: [...SUGGESTED.keep],
        segmentIndex: c.segmentIndex,
        originalTranscript,
      });
      order += 1;
      continue;
    }

    if (item.kind === "merge") {
      const [i0, i1] = item.sourceIndexes;
      const primaryIdx = item.mergedIntoIndex;
      const secondaryIdx = i0 === primaryIdx ? i1 : i0;
      const primary = candidates[primaryIdx];
      const secondary = candidates[secondaryIdx];
      if (!primary || !secondary) {
        continue;
      }
      const subj = subjectLabel(primary.intent, roster);
      out.push({
        id: `review-merge-${primaryIdx}-${secondaryIdx}-${order}`,
        section: sectionForKind("merge"),
        resolutionKind: "merge",
        segmentText: primary.segmentText,
        secondarySegmentText: secondary.segmentText,
        intentKind: subj.intentKind,
        playerId: subj.playerId,
        playerLabel: subj.playerLabel,
        sentiment: sentimentForIntent(primary.intent, primary.segmentText),
        reason: item.reason,
        sourceIndexes: [...item.sourceIndexes],
        mergedIntoIndex: item.mergedIntoIndex,
        order,
        suggestedActionLabels: [...SUGGESTED.merge],
        segmentIndex: primary.segmentIndex,
        originalTranscript,
      });
      order += 1;
      continue;
    }

    const c = item.candidate;
    const subj = subjectLabel(c.intent, roster);
    out.push({
      id: `review-ambiguous-${c.segmentIndex}-${order}`,
      section: sectionForKind("ambiguous"),
      resolutionKind: "ambiguous",
      segmentText: c.segmentText,
      intentKind: subj.intentKind,
      playerId: subj.playerId,
      playerLabel: subj.playerLabel,
      sentiment: sentimentForIntent(c.intent, c.segmentText),
      reason: item.reason,
      order,
      suggestedActionLabels: [...SUGGESTED.ambiguous],
      segmentIndex: c.segmentIndex,
      originalTranscript,
    });
    order += 1;
  }

  return out;
}

export function filterReviewItemsBySection(
  items: ArenaReviewListItem[],
  section: ArenaReviewListItem["section"]
): ArenaReviewListItem[] {
  return items.filter((x) => x.section === section).sort((a, b) => a.order - b.order);
}


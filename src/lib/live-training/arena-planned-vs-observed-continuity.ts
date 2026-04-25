/**
 * Deterministic continuity over team-level planned-vs-observed facts (read-only, no Prisma).
 * Russian copy lives in `crmTeamDetailCopy` — this module returns structural facts only.
 */

import type {
  ArenaPlannedVsObservedComparisonStatusDto,
  TeamPlannedVsObservedSummaryDto,
} from "./arena-planned-vs-observed-live-fact.dto";

export type TeamPlannedVsObservedContinuityKind =
  | "repeated_alignment"
  | "repeated_gap"
  | "unstable"
  | "insufficient_history"
  | "insufficient_data";

export type TeamPlannedVsObservedContinuityDto =
  | { kind: "repeated_alignment"; sampleSize: number; streak: number }
  | { kind: "repeated_gap"; sampleSize: number; streak: number }
  | { kind: "unstable"; sampleSize: number }
  | {
      kind: "insufficient_history";
      sampleSize: number;
      detail: "need_three" | "no_clear_pattern";
    }
  | {
      kind: "insufficient_data";
      sampleSize: number;
      detail: "all_sessions" | "core_sparse";
    };

function isStrongAlign(f: TeamPlannedVsObservedSummaryDto): boolean {
  if (f.comparisonStatus === "aligned") return true;
  if (f.comparisonStatus === "mixed") {
    return f.positiveSignalCount >= f.negativeSignalCount;
  }
  return false;
}

function isGap(f: TeamPlannedVsObservedSummaryDto): boolean {
  if (f.comparisonStatus === "diverged") return true;
  if (f.comparisonStatus === "mixed") {
    return f.positiveSignalCount < f.negativeSignalCount;
  }
  return false;
}

function streakFromNewest(
  facts: TeamPlannedVsObservedSummaryDto[],
  pred: (f: TeamPlannedVsObservedSummaryDto) => boolean
): number {
  let c = 0;
  for (const f of facts) {
    if (!pred(f)) break;
    c += 1;
  }
  return c;
}

/** Oldest first, drop insufficient_data for alternation scan. */
function coreStatusesOldestFirst(facts: TeamPlannedVsObservedSummaryDto[]): ArenaPlannedVsObservedComparisonStatusDto[] {
  const asc = [...facts].reverse();
  return asc
    .map((f) => f.comparisonStatus)
    .filter((s): s is ArenaPlannedVsObservedComparisonStatusDto => s !== "insufficient_data");
}

/** Strong align (A) vs gap (G): mixed split by signal counts; insufficient skipped. */
function abBucket(f: TeamPlannedVsObservedSummaryDto): "A" | "G" | null {
  if (f.comparisonStatus === "insufficient_data") return null;
  if (isStrongAlign(f)) return "A";
  if (isGap(f)) return "G";
  return null;
}

/** Oldest→newest, only A/G; unstable = len≥3 and every adjacent bucket differs. */
function isUnstableAlternation(facts: TeamPlannedVsObservedSummaryDto[]): boolean {
  const asc = [...facts].reverse();
  const seq = asc.map(abBucket).filter((x): x is "A" | "G" => x != null);
  if (seq.length < 3) return false;
  for (let i = 1; i < seq.length; i += 1) {
    if (seq[i] === seq[i - 1]) return false;
  }
  return true;
}

/**
 * facts: newest first, up to small fixed N (e.g. 5).
 */
export function computeTeamPlannedVsObservedContinuity(
  facts: TeamPlannedVsObservedSummaryDto[]
): TeamPlannedVsObservedContinuityDto | null {
  const n = facts.length;
  if (n === 0) return null;

  const insufficientCount = facts.filter((f) => f.comparisonStatus === "insufficient_data").length;
  if (insufficientCount === n && n >= 1) {
    return { kind: "insufficient_data", sampleSize: n, detail: "all_sessions" };
  }

  if (n < 3) {
    return { kind: "insufficient_history", sampleSize: n, detail: "need_three" };
  }

  const alignStreak = streakFromNewest(facts, isStrongAlign);
  const gapStreak = streakFromNewest(facts, isGap);

  if (alignStreak >= 2) {
    return { kind: "repeated_alignment", sampleSize: n, streak: alignStreak };
  }

  if (gapStreak >= 2) {
    return { kind: "repeated_gap", sampleSize: n, streak: gapStreak };
  }

  if (isUnstableAlternation(facts)) {
    return { kind: "unstable", sampleSize: n };
  }

  const core = coreStatusesOldestFirst(facts);
  if (core.length < 3) {
    return { kind: "insufficient_data", sampleSize: n, detail: "core_sparse" };
  }

  return { kind: "insufficient_history", sampleSize: n, detail: "no_clear_pattern" };
}

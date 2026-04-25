/**
 * Unit-style checks for team planned-vs-observed continuity (no DB, no Prisma).
 * Run: `npm run test:arena-planned-vs-observed-continuity`
 */

import type { TeamPlannedVsObservedSummaryDto } from "./arena-planned-vs-observed-live-fact.dto";
import { arenaPlannedVsObservedComparisonLabelRu } from "./arena-planned-vs-observed-live-fact.dto";
import {
  computeTeamPlannedVsObservedContinuity,
  type TeamPlannedVsObservedContinuityDto,
} from "./arena-planned-vs-observed-continuity";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

let sessionSeq = 0;

function mkFact(
  comparisonStatus: TeamPlannedVsObservedSummaryDto["comparisonStatus"],
  positiveSignalCount: number,
  negativeSignalCount: number
): TeamPlannedVsObservedSummaryDto {
  return {
    liveTrainingSessionId: `live-${sessionSeq++}`,
    comparisonStatus,
    comparisonLabelRu: arenaPlannedVsObservedComparisonLabelRu(comparisonStatus),
    plannedFocusText: null,
    observedFocusText: null,
    positiveSignalCount,
    negativeSignalCount,
    observedDomainsJson: null,
    factCreatedAt: "2026-01-01T12:00:00.000Z",
    liveConfirmedAt: null,
  };
}

function expectEqual(actual: TeamPlannedVsObservedContinuityDto | null, expected: TeamPlannedVsObservedContinuityDto) {
  assert(actual != null, "expected non-null continuity result");
  assert(actual.kind === expected.kind, `kind: want ${expected.kind}, got ${actual.kind}`);
  assert(actual.sampleSize === expected.sampleSize, `sampleSize: want ${expected.sampleSize}, got ${actual.sampleSize}`);
  if (expected.kind === "repeated_alignment" || expected.kind === "repeated_gap") {
    assert(actual.kind === expected.kind, "kind branch");
    assert("streak" in actual && "streak" in expected, "streak field");
    assert(actual.streak === expected.streak, `streak: want ${expected.streak}, got ${actual.streak}`);
  }
  if (expected.kind === "insufficient_history" || expected.kind === "insufficient_data") {
    assert(actual.kind === expected.kind, "detail branch");
    assert("detail" in actual && "detail" in expected, "detail field");
    assert(actual.detail === expected.detail, `detail: want ${expected.detail}, got ${actual.detail}`);
  }
}

function run() {
  sessionSeq = 0;

  assert(computeTeamPlannedVsObservedContinuity([]) === null, "empty → null");

  /* insufficient_history need_three */
  expectEqual(computeTeamPlannedVsObservedContinuity([mkFact("aligned", 1, 0)]), {
    kind: "insufficient_history",
    sampleSize: 1,
    detail: "need_three",
  });
  expectEqual(
    computeTeamPlannedVsObservedContinuity([mkFact("aligned", 1, 0), mkFact("diverged", 0, 1)]),
    { kind: "insufficient_history", sampleSize: 2, detail: "need_three" }
  );

  /* insufficient_data all_sessions */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("insufficient_data", 0, 0),
      mkFact("insufficient_data", 0, 0),
      mkFact("insufficient_data", 0, 0),
    ]),
    { kind: "insufficient_data", sampleSize: 3, detail: "all_sessions" }
  );

  /* insufficient_data core_sparse */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("aligned", 2, 0),
      mkFact("insufficient_data", 0, 0),
      mkFact("insufficient_data", 0, 0),
    ]),
    { kind: "insufficient_data", sampleSize: 3, detail: "core_sparse" }
  );

  /* repeated_alignment: two aligned from newest */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("aligned", 1, 0),
      mkFact("aligned", 2, 0),
      mkFact("diverged", 0, 2),
    ]),
    { kind: "repeated_alignment", sampleSize: 3, streak: 2 }
  );

  /* repeated_alignment: mixed with pos >= neg counts as strong align */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("mixed", 2, 1),
      mkFact("mixed", 1, 1),
      mkFact("diverged", 0, 3),
    ]),
    { kind: "repeated_alignment", sampleSize: 3, streak: 2 }
  );

  /* repeated_gap: two diverged from newest */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("diverged", 0, 2),
      mkFact("diverged", 0, 1),
      mkFact("aligned", 3, 0),
    ]),
    { kind: "repeated_gap", sampleSize: 3, streak: 2 }
  );

  /* repeated_gap: diverged + mixed (more negative) */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("mixed", 1, 3),
      mkFact("mixed", 0, 2),
      mkFact("aligned", 5, 0),
    ]),
    { kind: "repeated_gap", sampleSize: 3, streak: 2 }
  );

  /* unstable A/G/A oldest→newest (newest first: aligned, diverged, aligned) */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("aligned", 1, 0),
      mkFact("diverged", 0, 1),
      mkFact("aligned", 2, 0),
    ]),
    { kind: "unstable", sampleSize: 3 }
  );

  /* unstable G/A/G */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("diverged", 0, 1),
      mkFact("aligned", 2, 0),
      mkFact("diverged", 0, 2),
    ]),
    { kind: "unstable", sampleSize: 3 }
  );

  /* no_clear_pattern: no double streak, not alternating A/G */
  expectEqual(
    computeTeamPlannedVsObservedContinuity([
      mkFact("aligned", 2, 0),
      mkFact("diverged", 0, 2),
      mkFact("diverged", 0, 1),
    ]),
    { kind: "insufficient_history", sampleSize: 3, detail: "no_clear_pattern" }
  );

  /* mixed edge: equal counts → strong align, not gap */
  const eq = computeTeamPlannedVsObservedContinuity([
    mkFact("mixed", 2, 2),
    mkFact("mixed", 1, 1),
    mkFact("diverged", 0, 1),
  ]);
  assert(eq?.kind === "repeated_alignment" && eq.streak === 2, "mixed equal → alignment streak");

  /* mixed more positive */
  const morePos = computeTeamPlannedVsObservedContinuity([
    mkFact("mixed", 4, 1),
    mkFact("mixed", 2, 1),
    mkFact("diverged", 0, 1),
  ]);
  assert(morePos?.kind === "repeated_alignment" && morePos.streak === 2, "mixed pos>neg → alignment streak");

  /* mixed more negative */
  const moreNeg = computeTeamPlannedVsObservedContinuity([
    mkFact("mixed", 1, 4),
    mkFact("mixed", 1, 2),
    mkFact("aligned", 5, 0),
  ]);
  assert(moreNeg?.kind === "repeated_gap" && moreNeg.streak === 2, "mixed neg>pos → gap streak");

  console.log("arena-planned-vs-observed-continuity.selftest: ok");
}

run();

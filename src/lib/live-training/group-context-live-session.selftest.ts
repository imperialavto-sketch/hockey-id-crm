/**
 * Selftests: canonical group of session + pure group-context rollup/diagnostic helpers (no DB).
 * Run: `npm run test:group-context-live-session`
 */

import { canonicalGroupIdForLiveSession } from "@/lib/live-training/canonical-group-of-live-session";
import {
  LIVE_TRAINING_SESSION_GROUP_CONTEXT_ATTRIBUTION_VERSION,
  computeGroupContextCoverageKind,
  computeStampConsistencyKind,
  isSessionCanonicalV1Attributed,
  stampedArenaSessionGroupIdFromMetadata,
} from "@/lib/live-training/live-training-session-group-context-signal-rollup";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const V = LIVE_TRAINING_SESSION_GROUP_CONTEXT_ATTRIBUTION_VERSION;

function basePlanning(): Record<string, unknown> {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    teamId: "team-1",
    focusPlayers: [],
    focusDomains: [],
    reinforceAreas: [],
    summaryLines: [],
    planSeeds: { blocks: [], lowData: true },
  };
}

function runCanonicalTests() {
  assert(
    canonicalGroupIdForLiveSession({
      planningSnapshotJson: { ...basePlanning(), groupId: "root-g" },
    }) === "root-g",
    "root groupId string wins"
  );

  assert(
    canonicalGroupIdForLiveSession({
      planningSnapshotJson: { ...basePlanning(), groupId: null },
    }) === null,
    "explicit null root groupId → null"
  );

  assert(
    canonicalGroupIdForLiveSession({
      planningSnapshotJson: {
        ...basePlanning(),
        scheduleSlotContext: {
          teamId: "team-1",
          groupId: "slot-ctx-g",
        },
      },
    }) === "slot-ctx-g",
    "fallback scheduleSlotContext.groupId when root key absent"
  );

  assert(
    canonicalGroupIdForLiveSession({
      planningSnapshotJson: basePlanning(),
      linkedTrainingSessionGroupId: "linked-L",
    }) === "linked-L",
    "fallback linkedTrainingSessionGroupId"
  );

  assert(
    canonicalGroupIdForLiveSession({
      planningSnapshotJson: basePlanning(),
      linkedTrainingSessionGroupId: "  trim-me  ",
    }) === "trim-me",
    "linked id trimmed"
  );

  assert(
    canonicalGroupIdForLiveSession({
      planningSnapshotJson: { ...basePlanning(), groupId: "   " },
    }) === null,
    "root empty string normalizes to null"
  );
}

function runStampExtractTests() {
  const stamped = (arenaSessionGroupId: unknown) => ({
    arenaGroupAttributionVersion: V,
    arenaSessionGroupId,
  });

  assert(stampedArenaSessionGroupIdFromMetadata(stamped("gid-1")) === "gid-1", "stamped string id");

  assert(stampedArenaSessionGroupIdFromMetadata(stamped(null)) === null, "stamped null");

  assert(stampedArenaSessionGroupIdFromMetadata({ arenaSessionGroupId: "x" }) === null, "missing version → null");

  assert(stampedArenaSessionGroupIdFromMetadata("not-an-object") === null, "malformed metadata");

  assert(stampedArenaSessionGroupIdFromMetadata(stamped(42)) === null, "non-string arenaSessionGroupId");

  assert(isSessionCanonicalV1Attributed(stamped("a")) === true, "isSessionCanonical true");
  assert(isSessionCanonicalV1Attributed({}) === false, "isSessionCanonical false");
}

function runCoverageTests() {
  assert(
    computeGroupContextCoverageKind({
      totalSignalCount: 0,
      attributedSignalCount: 0,
      legacySignalCount: 0,
    }) === "no_signals",
    "coverage no_signals"
  );

  assert(
    computeGroupContextCoverageKind({
      totalSignalCount: 3,
      attributedSignalCount: 0,
      legacySignalCount: 3,
    }) === "all_legacy",
    "coverage all_legacy"
  );

  assert(
    computeGroupContextCoverageKind({
      totalSignalCount: 2,
      attributedSignalCount: 2,
      legacySignalCount: 0,
    }) === "fully_attributed",
    "coverage fully_attributed"
  );

  assert(
    computeGroupContextCoverageKind({
      totalSignalCount: 4,
      attributedSignalCount: 1,
      legacySignalCount: 3,
    }) === "mixed",
    "coverage mixed"
  );
}

function runConsistencyTests() {
  const expectKind = (
    input: Parameters<typeof computeStampConsistencyKind>[0],
    kind: ReturnType<typeof computeStampConsistencyKind>["consistencyKind"],
    label: string
  ) => {
    const r = computeStampConsistencyKind(input);
    assert(r.consistencyKind === kind, `${label}: want ${kind}, got ${r.consistencyKind}`);
  };

  expectKind(
    { totalSignalCount: 0, attributedSignalCount: 0, legacySignalCount: 0, canonicalGroupId: null, stampedNullPresent: false, distinctNonNullStampedGroupIds: [] },
    "no_signals",
    "no_signals"
  );

  expectKind(
    {
      totalSignalCount: 2,
      attributedSignalCount: 0,
      legacySignalCount: 2,
      canonicalGroupId: null,
      stampedNullPresent: false,
      distinctNonNullStampedGroupIds: [],
    },
    "no_attributed_signals",
    "no_attributed_signals"
  );

  expectKind(
    {
      totalSignalCount: 2,
      attributedSignalCount: 0,
      legacySignalCount: 2,
      canonicalGroupId: "G",
      stampedNullPresent: false,
      distinctNonNullStampedGroupIds: [],
    },
    "canonical_present_but_unstamped_only",
    "canonical_present_but_unstamped_only"
  );

  expectKind(
    {
      totalSignalCount: 1,
      attributedSignalCount: 1,
      legacySignalCount: 0,
      canonicalGroupId: "G1",
      stampedNullPresent: false,
      distinctNonNullStampedGroupIds: ["G1"],
    },
    "aligned",
    "aligned non-null id"
  );

  expectKind(
    {
      totalSignalCount: 1,
      attributedSignalCount: 1,
      legacySignalCount: 0,
      canonicalGroupId: null,
      stampedNullPresent: true,
      distinctNonNullStampedGroupIds: [],
    },
    "aligned",
    "aligned null-stamp"
  );

  expectKind(
    {
      totalSignalCount: 2,
      attributedSignalCount: 2,
      legacySignalCount: 0,
      canonicalGroupId: "G",
      stampedNullPresent: true,
      distinctNonNullStampedGroupIds: ["G"],
    },
    "mixed_stamps",
    "mixed_stamps"
  );

  expectKind(
    {
      totalSignalCount: 1,
      attributedSignalCount: 1,
      legacySignalCount: 0,
      canonicalGroupId: null,
      stampedNullPresent: false,
      distinctNonNullStampedGroupIds: ["X"],
    },
    "canonical_null_but_stamped",
    "canonical_null_but_stamped"
  );

  expectKind(
    {
      totalSignalCount: 1,
      attributedSignalCount: 1,
      legacySignalCount: 0,
      canonicalGroupId: "G",
      stampedNullPresent: false,
      distinctNonNullStampedGroupIds: ["Other"],
    },
    "mismatch",
    "mismatch id"
  );

  const m = computeStampConsistencyKind({
    totalSignalCount: 1,
    attributedSignalCount: 1,
    legacySignalCount: 0,
    canonicalGroupId: "G",
    stampedNullPresent: true,
    distinctNonNullStampedGroupIds: [],
  });
  assert(m.consistencyKind === "mismatch" && m.consistencyNote === "stamped_null_canonical_non_null", "mismatch null stamp vs canonical");
}

function run() {
  runCanonicalTests();
  runStampExtractTests();
  runCoverageTests();
  runConsistencyTests();
  console.log("group-context-live-session.selftest: ok");
}

run();

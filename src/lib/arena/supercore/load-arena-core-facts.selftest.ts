/**
 * Validates Arena Supercore loader contract (no production behavior change).
 *
 * Structural checks: always (no DB).
 * Integration: set ARENA_CORE_FACTS_SELFTEST_DB=1 — expects reachable DATABASE_URL; asserts unknown session → null.
 *
 * Run: npx tsx src/lib/arena/supercore/load-arena-core-facts.selftest.ts
 */

import { LiveTrainingMode, LiveTrainingSessionStatus } from "@prisma/client";
import { loadArenaCoreFacts } from "./load-arena-core-facts";
import type { ArenaCoreFacts, ArenaCoreCanonicalFacts, ArenaCoreDerivedFacts } from "./types";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function assertStructuralMock(): void {
  const canonical: ArenaCoreCanonicalFacts = {
    tier: "canonical",
    liveTrainingSessionId: "sess_test",
    coachId: "coach_test",
    teamId: "team_test",
    teamName: "Test Team",
    mode: LiveTrainingMode.ice,
    status: LiveTrainingSessionStatus.live,
    trainingSessionIdColumn: null,
    linkedTrainingSessionId: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
    confirmedAt: null,
    arenaNextFocusLine: null,
    arenaNextFocusAppliedAt: null,
    arenaNextFocusTargetTrainingSessionId: null,
    counts: {
      liveTrainingEvents: 0,
      liveTrainingPlayerSignals: 0,
      liveTrainingObservationDraftsActive: 0,
    },
    reportDraft: null,
    publishedTrainingSessionReport: null,
  };

  const derived: ArenaCoreDerivedFacts = {
    tier: "derived",
    sessionMeaning: null,
    planningSnapshot: null,
    analyticsSummary: {
      signalCount: 0,
      draftsWithPlayerCount: 0,
      playersWithSignals: 0,
    },
  };

  const f: ArenaCoreFacts = {
    meta: {
      version: "1",
      notes: ["selftest"],
      excluded: {
        externalTrainingContour: true,
        parentMixedReadModels: true,
        loadEnrichedLiveTrainingDraftsForSession: true,
      },
    },
    canonical,
    derived,
  };

  assert(f.canonical.tier === "canonical", "canonical tier marker");
  assert(f.derived.tier === "derived", "derived tier marker");
  assert(f.meta.version === "1", "meta version");
  assert(f.meta.excluded.externalTrainingContour === true, "v1 excludes external");
}

async function assertUnknownSessionNull(): Promise<void> {
  const res = await loadArenaCoreFacts({
    liveTrainingSessionId: "clnonexistentnonexistentnonexistent0",
  });
  assert(res === null, "unknown liveTrainingSessionId must return null");
}

async function main(): Promise<void> {
  assertStructuralMock();
  console.log("[ArenaCoreFacts selftest] structural: OK");

  if (process.env.ARENA_CORE_FACTS_SELFTEST_DB === "1") {
    await assertUnknownSessionNull();
    console.log("[ArenaCoreFacts selftest] integration (DB): OK");
  } else {
    console.log(
      "[ArenaCoreFacts selftest] skip DB integration (set ARENA_CORE_FACTS_SELFTEST_DB=1 to run)"
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

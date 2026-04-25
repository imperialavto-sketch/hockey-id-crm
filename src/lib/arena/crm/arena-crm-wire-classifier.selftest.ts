/**
 * Run: npx tsx src/lib/arena/crm/arena-crm-wire-classifier.selftest.ts
 *
 * Regression / honesty guard: CRM Arena wire status + region semantics + post-apply reload contract.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  arenaCrmWirePayloadIsNonEmpty,
  mapArenaCrmWireStatusToRegionKind,
  resolveArenaCrmWireFetchOutcome,
} from "./arena-crm-wire-classifier";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function run() {
  // --- 1) resolveArenaCrmWireFetchOutcome: error vs empty (no regression to silent empty on failure)
  const badHttp = resolveArenaCrmWireFetchOutcome(false, { supercoreOperationalFocus: [] });
  assert(badHttp.wireStatus === "error" && badHttp.parsed === null, "!httpOk must be error, not empty");

  const badParse = resolveArenaCrmWireFetchOutcome(true, {});
  assert(badParse.wireStatus === "error" && badParse.parsed === null, "malformed JSON shape must be error");

  const badParseNull = resolveArenaCrmWireFetchOutcome(true, null);
  assert(badParseNull.wireStatus === "error", "null body must be error");

  const emptyWire = resolveArenaCrmWireFetchOutcome(true, { supercoreOperationalFocus: [] });
  assert(emptyWire.wireStatus === "empty", "valid wire with no visible slices must be empty");
  assert(emptyWire.parsed !== null, "empty outcome still carries parsed object");
  assert(badParse.wireStatus === "error" && emptyWire.wireStatus === "empty", "error vs empty must differ");
  assert(arenaCrmWirePayloadIsNonEmpty(emptyWire.parsed!) === false, "empty parsed is not isNonEmpty");

  const line = {
    title: "T",
    body: "B",
    liveTrainingSessionId: "lt_sess_1",
    bindingDecisionId: "bd_1",
  };
  const withSupercore = resolveArenaCrmWireFetchOutcome(true, {
    supercoreOperationalFocus: [line],
  });
  assert(withSupercore.wireStatus === "success", "non-empty supercore -> success");
  assert(arenaCrmWirePayloadIsNonEmpty(withSupercore.parsed!) === true, "predicate: supercore lines");

  const teamOnly = resolveArenaCrmWireFetchOutcome(true, {
    supercoreOperationalFocus: [],
    teamSnapshot: {
      totalPlayers: 2,
      attentionZones: [],
      dominantStrengths: [],
    },
  });
  assert(teamOnly.wireStatus === "success", "team snapshot without supercore lines -> success");
  assert(arenaCrmWirePayloadIsNonEmpty(teamOnly.parsed!) === true, "predicate: team snapshot");

  const playerOnly = resolveArenaCrmWireFetchOutcome(true, {
    supercoreOperationalFocus: [],
    playerSnapshot: {
      trend: "stable" as const,
      recentSignals: 0,
      positiveCount: 0,
      attentionCount: 0,
      repeatedConcerns: 0,
    },
  });
  assert(playerOnly.wireStatus === "success", "player snapshot alone -> success");
  assert(arenaCrmWirePayloadIsNonEmpty(playerOnly.parsed!) === true, "predicate: player snapshot");

  const groupOnly = resolveArenaCrmWireFetchOutcome(true, {
    supercoreOperationalFocus: [],
    groupArenaSnapshots: [
      {
        groupId: "g1",
        groupSnapshot: {
          players: 3,
          attentionPlayers: 0,
          strongPlayers: 0,
          unstablePlayers: 0,
        },
      },
    ],
  });
  assert(groupOnly.wireStatus === "success", "group snapshots alone -> success");
  assert(arenaCrmWirePayloadIsNonEmpty(groupOnly.parsed!) === true, "predicate: group snapshots");

  // --- 2) Region kind mapping (idle hidden; notice for loading/error/empty; success -> children)
  assert(mapArenaCrmWireStatusToRegionKind("idle") === "hidden", "idle -> hidden (null render)");
  assert(mapArenaCrmWireStatusToRegionKind("loading") === "notice", "loading -> notice");
  assert(mapArenaCrmWireStatusToRegionKind("error") === "notice", "error -> notice");
  assert(mapArenaCrmWireStatusToRegionKind("empty") === "notice", "empty -> notice");
  assert(mapArenaCrmWireStatusToRegionKind("success") === "success", "success -> children region");

  // --- 3) Source contract: team + player CRM must bump reloadKey after successful apply (Arena wire refresh)
  const root = process.cwd();
  const teamSrc = readFileSync(join(root, "src/app/(dashboard)/teams/[id]/TeamDetailPageClient.tsx"), "utf8");
  const playerSrc = readFileSync(join(root, "src/app/(dashboard)/players/[id]/page.tsx"), "utf8");
  assert(
    /setApplyFocusOk\(true\);\s*\n\s*setReloadKey\(\(k\)/m.test(teamSrc),
    "team page: after setApplyFocusOk(true) must bump reloadKey (Arena wire)"
  );
  assert(
    /setApplyArenaFocusOk\(true\);\s*\n\s*setReloadKey\(\(k\)/m.test(playerSrc),
    "player page: after setApplyArenaFocusOk(true) must bump reloadKey (Arena wire)"
  );

  console.log("arena-crm-wire-classifier.selftest: ok");
}

run();

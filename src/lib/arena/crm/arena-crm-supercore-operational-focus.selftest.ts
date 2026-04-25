/**
 * Run: npx tsx src/lib/arena/crm/arena-crm-supercore-operational-focus.selftest.ts
 */

import type { ArenaActionEnvelope } from "@/lib/arena/supercore/actions";
import { arenaActionEnvelopesToCrmSupercoreOperationalFocusLines } from "./arena-crm-supercore-operational-focus";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function run() {
  const env: ArenaActionEnvelope = {
    id: "arena_env:s1:dec_x",
    audience: "crm",
    kind: "next_session_focus",
    title: "T",
    body: "B",
    priority: "medium",
    source: "supercore_binding_decision",
    refs: {
      bindingDecisionId: "dec_x",
      bindingDecisionKind: "arena_next_focus_column",
      supportedByTier: "canonical",
      factRefs: [],
    },
    materializable: false,
    playerId: null,
    playerDisplayName: null,
  };
  const lines = arenaActionEnvelopesToCrmSupercoreOperationalFocusLines([env], "s1");
  assert(lines.length === 1 && lines[0]!.bindingDecisionId === "dec_x", "crm line shape");

  console.log("arena-crm-supercore-operational-focus.selftest: ok");
}

run();

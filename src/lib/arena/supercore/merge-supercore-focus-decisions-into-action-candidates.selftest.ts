/**
 * Run: npx tsx src/lib/arena/supercore/merge-supercore-focus-decisions-into-action-candidates.selftest.ts
 */

import type { ArenaCoreBindings } from "./bindings";
import { mergeSupercoreFocusBindingDecisionsIntoActionCandidates } from "./merge-supercore-focus-decisions-into-action-candidates";
import type { LiveTrainingActionCandidateDto } from "@/lib/live-training/live-training-action-candidate-types";
import type { LiveTrainingSessionOutcomeDto } from "@/lib/live-training/live-training-session-outcome";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const emptyRefs = [] as const;

const outcome = {
  includedDraftsCount: 1,
  excludedDraftsCount: 0,
  draftsFlaggedNeedsReview: 0,
  manualAttentionDraftsCount: 0,
  playerObservationCount: 0,
  playerLinkedObservationCount: 0,
  playerObservationUnlinkedCount: 0,
  teamObservationCount: 0,
  sessionObservationCount: 0,
  signalsCreatedCount: 2,
  affectedPlayersCount: 1,
  positiveSignalsCount: 0,
  negativeSignalsCount: 0,
  neutralSignalsCount: 0,
  topDomains: ["skating"],
  topPlayers: [],
} satisfies LiveTrainingSessionOutcomeDto;

const bindings: ArenaCoreBindings = {
  version: "1",
  interpretations: [],
  decisions: [
    {
      id: "dec_arena_col",
      kind: "arena_next_focus_column",
      text: "Уникальный фокус колонки",
      supportedByTier: "canonical",
      factRefs: emptyRefs,
    },
    {
      id: "dec_next_0",
      kind: "session_meaning_next_training_focus",
      text: "Второй фокус смысла",
      supportedByTier: "derived",
      factRefs: emptyRefs,
    },
  ],
  explanations: [],
  notes: [],
};

function run() {
  const sid = "sess_merge_test";
  const merged = mergeSupercoreFocusBindingDecisionsIntoActionCandidates({
    items: [],
    bindings,
    sessionId: sid,
    sessionStartedAt: new Date(0).toISOString(),
    outcome,
  });
  assert(merged.length === 2, "two supercore rows");
  assert(merged[0]!.id === `ltac:s:${sid}:supercore:dec_arena_col`, "id prefix for materialize gate");
  assert(merged[0]!.actionType === "focus_next_training", "action type");

  const existing: LiveTrainingActionCandidateDto[] = [
    {
      id: `ltac:s:${sid}:p:x:monitor_technique`,
      playerId: "x",
      playerName: "A",
      source: "live_training",
      actionType: "monitor_technique",
      title: "Уникальный фокус колонки",
      body: "dup",
      tone: "neutral",
      priority: "low",
      basedOn: { signalCount: 1, domains: [], lastSessionAt: null },
    },
  ];
  const deduped = mergeSupercoreFocusBindingDecisionsIntoActionCandidates({
    items: existing,
    bindings,
    sessionId: sid,
    sessionStartedAt: new Date(0).toISOString(),
    outcome,
  });
  assert(deduped.length === 2, "dedupe by title");

  console.log("merge-supercore-focus-decisions-into-action-candidates.selftest: ok");
}

run();

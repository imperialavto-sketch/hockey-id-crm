/**
 * Run: npx tsx src/lib/arena/supercore/actions.selftest.ts
 */

import type { ArenaCoreBindings } from "./bindings";
import {
  arenaBindingDecisionToArenaActionEnvelope,
  arenaActionEnvelopeToLiveTrainingActionCandidateDto,
  arenaFocusBindingDecisionsToActionEnvelopes,
} from "./actions";
import type { LiveTrainingSessionOutcomeDto } from "@/lib/live-training/live-training-session-outcome";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const emptyRefs = [] as const;

const bindings: ArenaCoreBindings = {
  version: "1",
  interpretations: [],
  decisions: [
    {
      id: "dec_wrong",
      kind: "session_meaning_action_trigger",
      text: "x",
      supportedByTier: "derived",
      factRefs: emptyRefs,
    },
    {
      id: "dec_arena",
      kind: "arena_next_focus_column",
      text: "Колонка фокуса",
      supportedByTier: "canonical",
      factRefs: emptyRefs,
    },
    {
      id: "dec_next",
      kind: "session_meaning_next_training_focus",
      text: "Смысл следующей тренировки",
      supportedByTier: "derived",
      factRefs: emptyRefs,
    },
  ],
  explanations: [],
  notes: [],
};

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
  signalsCreatedCount: 3,
  affectedPlayersCount: 1,
  positiveSignalsCount: 0,
  negativeSignalsCount: 0,
  neutralSignalsCount: 0,
  topDomains: ["skating"],
  topPlayers: [],
} satisfies LiveTrainingSessionOutcomeDto;

function run() {
  const sid = "sess_actions_test";
  assert(
    arenaBindingDecisionToArenaActionEnvelope({
      decision: bindings.decisions[0]!,
      liveTrainingSessionId: sid,
    }) === null,
    "trigger kind not mapped in pass 8"
  );

  const envs = arenaFocusBindingDecisionsToActionEnvelopes(bindings, sid, "coach");
  assert(envs.length === 2 && envs[0]!.refs.bindingDecisionKind === "arena_next_focus_column", "order + filter");

  const dto = arenaActionEnvelopeToLiveTrainingActionCandidateDto(envs[0]!, {
    sessionId: sid,
    sessionStartedAt: new Date(0).toISOString(),
    outcome,
  });
  assert(dto.id === `ltac:s:${sid}:supercore:dec_arena`, "dto id for materialize");
  assert(dto.actionType === "focus_next_training", "adapter maps kind");

  console.log("actions.selftest: ok");
}

run();

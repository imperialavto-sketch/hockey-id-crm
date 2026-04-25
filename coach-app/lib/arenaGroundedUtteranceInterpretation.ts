/**
 * PHASE 2 — Grounded utterance interpretation contract (coach STT → structure only).
 *
 * GROUNDING CONTRACT
 * --------------------
 * This module does not invent gameplay facts. It maps verbatim coach speech to a typed
 * envelope using existing deterministic parsers (`parseArenaCommand`). If the parser
 * refuses (clarification) or yields `unknown`, the envelope marks `needsClarification` /
 * omits confident fields — never fabricates players or event types.
 */

import type { ArenaConversationContext } from "@/lib/arenaConversationContext";
import {
  parseArenaCommand,
  stripWakeWordFromTranscript,
  type ArenaParsedIntent,
  type RosterEntry,
} from "@/lib/arenaVoiceIntentParser";
import { normalizeArenaTranscript } from "@/lib/arenaTranscriptNormalizer";

export const ARENA_GROUNDED_UTTERANCE_SOURCE = "coach_utterance" as const;

export type ArenaGroundedUtteranceInterpretation = {
  groundedSource: typeof ARENA_GROUNDED_UTTERANCE_SOURCE;
  rawTranscript: string;
  normalizedText: string;
  referencedPlayerId?: string | null;
  referencedPlayerName?: string | null;
  /** Ontology / parser category string when parser supplied it; never guessed beyond parser. */
  eventType?: string | null;
  confidence: number | null;
  needsClarification: boolean;
  clarificationReason?: string | null;
  /** Present only when `parseArenaCommand` succeeded with a concrete intent. */
  resolvedIntentKind?: ArenaParsedIntent["kind"];
};

/** Intents that may run from continuous idle STT without the wake token (observation + read-only status). */
export function isArenaUtteranceFirstAllowedIntent(intent: ArenaParsedIntent): boolean {
  switch (intent.kind) {
    case "create_player_observation":
    case "create_team_observation":
    case "create_session_observation":
    case "ask_last_observation_status":
      return true;
    default:
      return false;
  }
}

export function isArenaControlIntentRequiringWake(intent: ArenaParsedIntent): boolean {
  return !isArenaUtteranceFirstAllowedIntent(intent);
}

function rosterNameById(roster: RosterEntry[], id: string | null | undefined): string | null {
  if (!id) return null;
  return roster.find((r) => r.id === id)?.name ?? null;
}

function confidenceFromIntent(intent: ArenaParsedIntent): number | null {
  if (
    intent.kind === "create_player_observation" ||
    intent.kind === "create_team_observation" ||
    intent.kind === "create_session_observation"
  ) {
    return typeof intent.confidence === "number" ? intent.confidence : null;
  }
  return null;
}

function eventTypeFromIntent(intent: ArenaParsedIntent): string | null {
  if (
    intent.kind === "create_player_observation" ||
    intent.kind === "create_team_observation" ||
    intent.kind === "create_session_observation"
  ) {
    return intent.category ?? null;
  }
  return null;
}

/**
 * Builds a grounded interpretation record from coach speech + roster + conversation context.
 * Does not POST, enqueue, or mutate session memory beyond pure computation.
 */
export function buildArenaGroundedUtteranceInterpretation(args: {
  rawTranscript: string;
  roster: RosterEntry[];
  conversationCtx: ArenaConversationContext;
}): ArenaGroundedUtteranceInterpretation {
  const raw = args.rawTranscript.trim();
  const normalizedText = normalizeArenaTranscript(stripWakeWordFromTranscript(raw.length ? raw : ""));
  if (!raw) {
    return {
      groundedSource: ARENA_GROUNDED_UTTERANCE_SOURCE,
      rawTranscript: raw,
      normalizedText,
      confidence: null,
      needsClarification: true,
      clarificationReason: "empty_transcript",
    };
  }

  const parsed = parseArenaCommand(raw, args.roster, args.conversationCtx);
  if (!parsed.ok) {
    return {
      groundedSource: ARENA_GROUNDED_UTTERANCE_SOURCE,
      rawTranscript: raw,
      normalizedText,
      confidence: null,
      needsClarification: true,
      clarificationReason: `parser_clarification:${parsed.clarificationType}`,
      eventType: parsed.pendingObservation.domain ?? null,
    };
  }

  const intent = parsed.intent;
  if (intent.kind === "unknown") {
    return {
      groundedSource: ARENA_GROUNDED_UTTERANCE_SOURCE,
      rawTranscript: raw,
      normalizedText,
      confidence: null,
      needsClarification: true,
      clarificationReason: "unrecognized_or_insufficient_utterance",
      resolvedIntentKind: "unknown",
    };
  }

  const referencedPlayerId =
    intent.kind === "create_player_observation" ? intent.playerId : null;
  const referencedPlayerName = rosterNameById(args.roster, referencedPlayerId);

  return {
    groundedSource: ARENA_GROUNDED_UTTERANCE_SOURCE,
    rawTranscript: raw,
    normalizedText,
    referencedPlayerId,
    referencedPlayerName,
    eventType: eventTypeFromIntent(intent),
    confidence: confidenceFromIntent(intent),
    needsClarification: false,
    clarificationReason: null,
    resolvedIntentKind: intent.kind,
  };
}

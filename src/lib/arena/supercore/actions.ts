/**
 * Arena Supercore — unified server-internal action envelope (pass 8).
 * Not a persistence layer; adapters map envelopes to route DTOs (coach/parent/CRM).
 *
 * Pass 8 scope: decisions from `ArenaCoreBindings` used for live-training action-candidates pilot only.
 */

import type { ArenaCoreBindings, ArenaDecisionRecord, ArenaFactRef } from "./bindings";
import type { LiveTrainingActionCandidateDto } from "@/lib/live-training/live-training-action-candidate-types";
import type { LiveTrainingSessionOutcomeDto } from "@/lib/live-training/live-training-session-outcome";

const TITLE_MAX = 200;

/** Consumers of an envelope (routing/adapters pick fields). */
export type ArenaActionAudience = "coach" | "crm" | "parent" | "internal";

/** Where the row was produced (pass 8: only supercore binding decisions). */
export type ArenaActionSource = "supercore_binding_decision";

/**
 * Product-level kind for cross-surface adapters.
 * Pass 8: only `next_session_focus` is emitted (maps to `focus_next_training` on coach DTO).
 */
export type ArenaActionKind = "next_session_focus";

/** Provenance anchor: binding decision + its fact refs (no invented ids). */
export type ArenaActionRef = {
  bindingDecisionId: string;
  bindingDecisionKind: ArenaDecisionRecord["kind"];
  supportedByTier: "canonical" | "derived";
  factRefs: readonly ArenaFactRef[];
};

export type ArenaActionEnvelope = {
  /** Stable within server session scope: `arena_env:${liveTrainingSessionId}:${bindingDecisionId}` */
  id: string;
  audience: ArenaActionAudience;
  kind: ArenaActionKind;
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
  source: ArenaActionSource;
  refs: ArenaActionRef;
  /**
   * Honest: coach live-training candidates with id prefix `ltac:s:` can use existing materialize POST.
   * Other surfaces may set false until wired.
   */
  materializable: boolean;
  playerId: string | null;
  playerDisplayName: string | null;
};

const FOCUS_DECISION_KINDS: ReadonlySet<ArenaDecisionRecord["kind"]> = new Set([
  "arena_next_focus_column",
  "session_meaning_next_training_focus",
]);

function truncateTitle(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Single binding decision → envelope, or null if kind not supported in pass 8. */
export function arenaBindingDecisionToArenaActionEnvelope(params: {
  decision: ArenaDecisionRecord;
  liveTrainingSessionId: string;
  audience?: ArenaActionAudience;
}): ArenaActionEnvelope | null {
  const { decision, liveTrainingSessionId } = params;
  if (!FOCUS_DECISION_KINDS.has(decision.kind)) return null;
  const body = decision.text.trim();
  if (!body) return null;
  const title = truncateTitle(body, TITLE_MAX);
  const audience = params.audience ?? "coach";
  return {
    id: `arena_env:${liveTrainingSessionId}:${decision.id}`,
    audience,
    kind: "next_session_focus",
    title,
    body,
    priority: "medium",
    source: "supercore_binding_decision",
    refs: {
      bindingDecisionId: decision.id,
      bindingDecisionKind: decision.kind,
      supportedByTier: decision.supportedByTier,
      factRefs: decision.factRefs,
    },
    materializable: audience === "coach",
    playerId: decision.playerId?.trim() ?? null,
    playerDisplayName: null,
  };
}

/**
 * Ordered list: `arena_next_focus_column` first, then `session_meaning_next_training_focus`
 * (matches prior merge behavior).
 */
export function arenaFocusBindingDecisionsToActionEnvelopes(
  bindings: ArenaCoreBindings,
  liveTrainingSessionId: string,
  audience?: ArenaActionAudience
): ArenaActionEnvelope[] {
  const out: ArenaActionEnvelope[] = [];
  const push = (d: ArenaDecisionRecord) => {
    const env = arenaBindingDecisionToArenaActionEnvelope({
      decision: d,
      liveTrainingSessionId,
      audience,
    });
    if (env) out.push(env);
  };
  for (const d of bindings.decisions) {
    if (d.kind === "arena_next_focus_column") push(d);
  }
  for (const d of bindings.decisions) {
    if (d.kind === "session_meaning_next_training_focus") push(d);
  }
  return out;
}

/** Coach live-training action-candidate DTO (existing HTTP contract). */
export function arenaActionEnvelopeToLiveTrainingActionCandidateDto(
  envelope: ArenaActionEnvelope,
  params: {
    sessionId: string;
    sessionStartedAt: string;
    outcome: LiveTrainingSessionOutcomeDto;
  }
): LiveTrainingActionCandidateDto {
  const { sessionId, sessionStartedAt, outcome } = params;
  const bindingId = envelope.refs.bindingDecisionId;
  return {
    id: `ltac:s:${sessionId}:supercore:${bindingId}`,
    playerId: envelope.playerId,
    playerName: envelope.playerDisplayName?.trim() || "Команда",
    source: "live_training",
    actionType: "focus_next_training",
    title: envelope.title,
    body: envelope.body,
    tone: "neutral",
    priority: envelope.priority,
    basedOn: {
      signalCount: outcome.signalsCreatedCount,
      domains: [...outcome.topDomains],
      lastSessionAt: sessionStartedAt,
    },
  };
}

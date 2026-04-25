/**
 * Arena Session Context Store — PHASE 1 grounded substrate + PHASE 2 session memory fields.
 *
 * GROUNDING CONTRACT
 * --------------------
 * This store must only hold facts, never speculative narrative:
 * - Identifiers and roster snapshots copied from authenticated session/API state.
 * - Coach utterances only as verbatim text that was actually recognized (fed by STT).
 * - “Confirmed” events only after an explicit successful outcome (e.g. voice POST ok,
 *   ingest clarification retry posted, or an explicit UI confirmation path).
 * - Ambiguity is represented only as `pendingClarification` with an explicit tag from
 *   the parser or server (422), never as guessed entities.
 *
 * If data is missing, upstream layers must ask for clarification — not invent.
 */

import type { ArenaGroundedUtteranceInterpretation } from "@/lib/arenaGroundedUtteranceInterpretation";
import type { ArenaSafeAutoPersistVerdict } from "@/lib/arenaSafeAutoPersistPolicy";
import type { RosterEntry } from "@/lib/arenaVoiceIntentParser";

export type ArenaConfirmedSessionEventSource =
  | "voice_post_ok"
  | "ingest_clarify_retry_ok"
  | "explicit_clear";

export type ArenaConfirmedSessionEvent = {
  at: number;
  source: ArenaConfirmedSessionEventSource;
  /** Verbatim or server phrase tied to the confirmation (no paraphrase “fixes”). */
  rawText?: string;
  draftId?: string;
  playerId?: string | null;
};

/** Parser / server-driven clarification; not inferred roster guesses. */
export type ArenaPendingClarificationRecord =
  | {
      kind: "parser_followup";
      clarificationType: "player" | "target" | "meaning";
      createdAt: number;
    }
  | {
      kind: "ingest_voice";
      phrase: string;
      createdAt: number;
    };

export type ArenaSessionContextSnapshot = {
  sessionId: string | null;
  teamId: string | null;
  groupId: string | null;
  rosterSnapshot: RosterEntry[];
  /** Normalized id → display name from roster (grounded map, not nick inference). */
  nameAliases: Record<string, string>;
  /** Optional short label from planning snapshot only when present on session. */
  liveFocusLabel: string | null;
  confirmedEvents: ArenaConfirmedSessionEvent[];
  pendingClarification: ArenaPendingClarificationRecord | null;
  /**
   * Last player id suggested only from grounded flows (e.g. successful voice observation
   * or explicit clarification answer). Never set from fuzzy roster guessing here.
   */
  lastGroundedPlayerCandidate: { playerId: string; source: ArenaConfirmedSessionEventSource } | null;
  offlineOrDegraded: boolean;
  /**
   * Last structured envelope from verbatim STT + deterministic parser only.
   * Does not assert truth about the ice — only what was said / parsed.
   */
  lastGroundedInterpretation: ArenaGroundedUtteranceInterpretation | null;
  /** Last voice auto-persist safety evaluation (parser flags + explicit policy). */
  lastSafeAutoPersistVerdict: ArenaSafeAutoPersistVerdict | null;
  /** Monotonic client clock: last time a voice observation hit offline/transient enqueue. */
  lastVoiceObservationQueuedAt: number | null;
  /** True while live screen is actively flushing the persisted outbox (transport). */
  outboxFlushInFlight: boolean;
};

const MAX_CONFIRMED = 24;

function rosterToAliasMap(roster: RosterEntry[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const r of roster) {
    m[r.id] = r.name;
  }
  return m;
}

export class ArenaSessionContextStore {
  private snapshot: ArenaSessionContextSnapshot = {
    sessionId: null,
    teamId: null,
    groupId: null,
    rosterSnapshot: [],
    nameAliases: {},
    liveFocusLabel: null,
    confirmedEvents: [],
    pendingClarification: null,
    lastGroundedPlayerCandidate: null,
    offlineOrDegraded: false,
    lastGroundedInterpretation: null,
    lastSafeAutoPersistVerdict: null,
    lastVoiceObservationQueuedAt: null,
    outboxFlushInFlight: false,
  };

  setSessionContext(args: {
    sessionId: string | null;
    teamId?: string | null;
    groupId?: string | null;
    liveFocusLabel?: string | null;
    offlineOrDegraded?: boolean;
  }): void {
    this.snapshot = {
      ...this.snapshot,
      sessionId: args.sessionId,
      teamId: args.teamId ?? null,
      groupId: args.groupId ?? null,
      liveFocusLabel: args.liveFocusLabel ?? null,
      offlineOrDegraded: args.offlineOrDegraded ?? this.snapshot.offlineOrDegraded,
    };
  }

  updateRosterContext(roster: RosterEntry[]): void {
    this.snapshot = {
      ...this.snapshot,
      rosterSnapshot: roster.slice(),
      nameAliases: rosterToAliasMap(roster),
    };
  }

  pushConfirmedEvent(ev: ArenaConfirmedSessionEvent): void {
    const next = [...this.snapshot.confirmedEvents, ev].slice(-MAX_CONFIRMED);
    let lastPlayer = this.snapshot.lastGroundedPlayerCandidate;
    if (ev.playerId && (ev.source === "voice_post_ok" || ev.source === "ingest_clarify_retry_ok")) {
      lastPlayer = { playerId: ev.playerId, source: ev.source };
    }
    this.snapshot = {
      ...this.snapshot,
      confirmedEvents: next,
      lastGroundedPlayerCandidate: lastPlayer,
    };
  }

  setPendingClarification(rec: ArenaPendingClarificationRecord | null): void {
    this.snapshot = {
      ...this.snapshot,
      pendingClarification: rec,
    };
  }

  /** Explicit successful resolution of a pending clarification (clears pending). */
  resolveClarification(): void {
    this.snapshot = {
      ...this.snapshot,
      pendingClarification: null,
    };
  }

  clearClarification(): void {
    this.snapshot = {
      ...this.snapshot,
      pendingClarification: null,
    };
  }

  setOfflineOrDegraded(flag: boolean): void {
    this.snapshot = {
      ...this.snapshot,
      offlineOrDegraded: flag,
    };
  }

  setLastGroundedInterpretation(rec: ArenaGroundedUtteranceInterpretation | null): void {
    this.snapshot = {
      ...this.snapshot,
      lastGroundedInterpretation: rec,
    };
  }

  setLastSafeAutoPersistVerdict(v: ArenaSafeAutoPersistVerdict | null): void {
    this.snapshot = {
      ...this.snapshot,
      lastSafeAutoPersistVerdict: v,
    };
  }

  /** Voice POST returned transient/offline enqueue — not a confirmed server draft. */
  markVoiceObservationQueuedTransport(at: number = Date.now()): void {
    this.snapshot = {
      ...this.snapshot,
      lastVoiceObservationQueuedAt: at,
      offlineOrDegraded: true,
    };
  }

  /** Successful HTTP accept path for a draft (or explicit retry ok) clears degraded heuristic. */
  markVoiceObservationHttpAccepted(): void {
    this.snapshot = {
      ...this.snapshot,
      offlineOrDegraded: false,
    };
  }

  setOutboxFlushInFlight(flag: boolean): void {
    this.snapshot = {
      ...this.snapshot,
      outboxFlushInFlight: flag,
    };
  }

  getSnapshot(): ArenaSessionContextSnapshot {
    return { ...this.snapshot, rosterSnapshot: this.snapshot.rosterSnapshot.slice() };
  }
}

/**
 * Состояние незавершённого уточнения «Арены» (in-memory, session-scoped).
 */

import type {
  ArenaClarificationType,
  ArenaPendingObservationPayload,
  RosterEntry,
} from "@/lib/arenaVoiceIntentParser";

export const ARENA_PENDING_CLARIFICATION_TTL_MS = 120_000;
/** После стольких неудачных follow-up подряд — сброс и просьба повторить команду */
export const ARENA_CLARIFY_MAX_FAILURES = 3;

export type ArenaPendingClarificationState =
  | {
      kind: "awaiting_followup";
      sessionId: string;
      clarificationType: ArenaClarificationType;
      prompt: string;
      pendingObservation: ArenaPendingObservationPayload;
      candidates?: RosterEntry[];
      retryCount: number;
      createdAt: number;
    }
  | { kind: "idle" };

export type ArenaPendingClarificationActive = Extract<
  ArenaPendingClarificationState,
  { kind: "awaiting_followup" }
>;

export function createIdleArenaPendingClarification(): ArenaPendingClarificationState {
  return { kind: "idle" };
}

export function isArenaPendingClarificationStale(
  state: ArenaPendingClarificationState,
  nowMs: number,
  sessionId: string | undefined
): boolean {
  if (state.kind !== "awaiting_followup") return true;
  if (!sessionId || state.sessionId !== sessionId) return true;
  return nowMs - state.createdAt > ARENA_PENDING_CLARIFICATION_TTL_MS;
}

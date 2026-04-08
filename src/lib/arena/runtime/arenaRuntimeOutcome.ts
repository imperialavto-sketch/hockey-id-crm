import type { ResolvePlayerFromSpeechResult } from "./arenaPlayerResolver";

/**
 * Структурированные исходы для live ingest, когда событие не персистится
 * (уточнение, политика, неверный игрок).
 */
export type ArenaRuntimeOutcomeKind =
  | "needs_clarification"
  | "ignored_by_policy"
  | "invalid_player_context";

export type ArenaRuntimePolicyHit = {
  code: string;
  detail?: string;
};

export type ArenaRuntimeStructuredOutcome = {
  arenaOutcome: ArenaRuntimeOutcomeKind;
  /** Стабильный код причины для клиента (не пользовательская строка). */
  reason: string;
  speechResolution?: ResolvePlayerFromSpeechResult;
  policy?: ArenaRuntimePolicyHit;
};

/** Тело ответа для HTTP-ошибки live ingest (см. `LiveTrainingHttpError` в live-training). */
export function arenaRuntimeOutcomeToHttpBody(
  o: ArenaRuntimeStructuredOutcome
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    arenaOutcome: o.arenaOutcome,
    reason: o.reason,
  };
  if (o.speechResolution !== undefined) {
    body.speechResolution = o.speechResolution;
  }
  if (o.policy !== undefined) {
    body.policy = o.policy;
  }
  return body;
}

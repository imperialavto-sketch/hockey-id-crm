/**
 * Минимальная структура интерпретации live-наблюдения Arena (coach-facing foundation).
 * Детерминированные правила — см. `interpretArenaObservation.ts`.
 */

export type ArenaInterpretationSignalKind =
  | "success"
  | "mistake"
  | "neutral_observation";

export type ArenaInterpretationDomain =
  | "technical"
  | "tactical"
  | "physical"
  | "behavioral"
  | "unclear";

export type ArenaInterpretationDirection = "positive" | "negative" | "neutral";

export type ArenaInterpretationConfidence = "high" | "medium" | "low";

export type ArenaObservationInterpretation = {
  signalKind: ArenaInterpretationSignalKind;
  domain: ArenaInterpretationDomain;
  direction: ArenaInterpretationDirection;
  confidence: ArenaInterpretationConfidence;
  needsReview: boolean;
  rationale?: string;
};

const SIGNAL_KINDS: ArenaInterpretationSignalKind[] = [
  "success",
  "mistake",
  "neutral_observation",
];

const DOMAINS: ArenaInterpretationDomain[] = [
  "technical",
  "tactical",
  "physical",
  "behavioral",
  "unclear",
];

const DIRECTIONS: ArenaInterpretationDirection[] = ["positive", "negative", "neutral"];

const CONFIDENCES: ArenaInterpretationConfidence[] = ["high", "medium", "low"];

export function parseArenaObservationInterpretationFromUnknown(
  raw: unknown
): ArenaObservationInterpretation | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const sk = o.signalKind;
  const dom = o.domain;
  const dir = o.direction;
  const conf = o.confidence;
  const nr = o.needsReview;
  if (
    typeof sk !== "string" ||
    !SIGNAL_KINDS.includes(sk as ArenaInterpretationSignalKind) ||
    typeof dom !== "string" ||
    !DOMAINS.includes(dom as ArenaInterpretationDomain) ||
    typeof dir !== "string" ||
    !DIRECTIONS.includes(dir as ArenaInterpretationDirection) ||
    typeof conf !== "string" ||
    !CONFIDENCES.includes(conf as ArenaInterpretationConfidence) ||
    typeof nr !== "boolean"
  ) {
    return null;
  }
  const rationale = typeof o.rationale === "string" && o.rationale.trim() ? o.rationale.trim() : undefined;
  return {
    signalKind: sk as ArenaInterpretationSignalKind,
    domain: dom as ArenaInterpretationDomain,
    direction: dir as ArenaInterpretationDirection,
    confidence: conf as ArenaInterpretationConfidence,
    needsReview: nr,
    ...(rationale ? { rationale } : {}),
  };
}

export function arenaObservationInterpretationToJson(
  i: ArenaObservationInterpretation
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    signalKind: i.signalKind,
    domain: i.domain,
    direction: i.direction,
    confidence: i.confidence,
    needsReview: i.needsReview,
  };
  if (i.rationale) out.rationale = i.rationale;
  return out;
}

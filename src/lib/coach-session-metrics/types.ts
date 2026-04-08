/**
 * Canonical TypeScript shape for `PlayerSessionStructuredMetrics` JSON buckets (schema v1).
 * Keep in sync with `coach-app/lib/coachSessionMetricsFoundation.ts`.
 */

export const COACH_SESSION_METRICS_SCHEMA_VERSION = 1 as const;

/** Subjective axis 1–5 used across ice / tactical / ОФП / physical / behavioral buckets. */
export type CoachMetricAxis1to5 = 1 | 2 | 3 | 4 | 5;

export interface IceTechnicalMetricsV1 {
  skating?: CoachMetricAxis1to5 | null;
  passing?: CoachMetricAxis1to5 | null;
  shooting?: CoachMetricAxis1to5 | null;
  puckControl?: CoachMetricAxis1to5 | null;
  balance?: CoachMetricAxis1to5 | null;
  coordination?: CoachMetricAxis1to5 | null;
}

export interface TacticalMetricsV1 {
  positioning?: CoachMetricAxis1to5 | null;
  decisionMaking?: CoachMetricAxis1to5 | null;
  offPuckWork?: CoachMetricAxis1to5 | null;
  discipline?: CoachMetricAxis1to5 | null;
  gameAwareness?: CoachMetricAxis1to5 | null;
}

/** Qualitative ОФП snapshot for the session; timed/jump tests use `OFPResult` in Prisma. */
export interface OfpQualitativeMetricsV1 {
  speed?: CoachMetricAxis1to5 | null;
  endurance?: CoachMetricAxis1to5 | null;
  strength?: CoachMetricAxis1to5 | null;
  agility?: CoachMetricAxis1to5 | null;
  mobility?: CoachMetricAxis1to5 | null;
  balance?: CoachMetricAxis1to5 | null;
}

export interface PhysicalSessionMetricsV1 {
  exertion?: CoachMetricAxis1to5 | null;
}

export interface BehavioralMetricsV1 {
  focus?: CoachMetricAxis1to5 | null;
  engagement?: CoachMetricAxis1to5 | null;
  /** Отдельно от тактического `discipline` в `TacticalMetricsV1` — поведенческий слой сессии. */
  discipline?: CoachMetricAxis1to5 | null;
}

export interface ObservationBlockV1 {
  strengths?: string[];
  growthAreas?: string[];
  tags?: string[];
  note?: string;
}

export interface VoiceMetaBlockV1 {
  draftSessionId?: string;
  rawTranscriptRef?: string;
  confidence?: number;
  reviewRequired?: boolean;
  extractedObservationIds?: string[];
}

/** Payload accepted by validation before Prisma upsert (partial merge). */
export interface PlayerSessionStructuredMetricsPayloadV1 {
  schemaVersion?: number;
  iceTechnical?: IceTechnicalMetricsV1 | null;
  tactical?: TacticalMetricsV1 | null;
  ofpQualitative?: OfpQualitativeMetricsV1 | null;
  physical?: PhysicalSessionMetricsV1 | null;
  behavioral?: BehavioralMetricsV1 | null;
  observation?: ObservationBlockV1 | null;
  voiceMeta?: VoiceMetaBlockV1 | null;
}

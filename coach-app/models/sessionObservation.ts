/**
 * Session Observation — Coach input layer types
 */

import type { SkillType } from "./playerDevelopment";

export type ObservationImpact = "positive" | "negative" | "neutral";

export interface SessionObservation {
  id: string;
  playerId: string;
  playerName: string;
  skillType: SkillType;
  impact: ObservationImpact;
  note?: string;
  createdAt: number;
}

export type SessionStatus = "idle" | "active" | "review" | "completed";

export interface TrainingSessionDraft {
  id: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  status: SessionStatus;
  observations: SessionObservation[];
}

/** Immutable snapshot of a confirmed session for history */
export interface CompletedTrainingSession {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number;
  status: "completed";
  observations: SessionObservation[];
}

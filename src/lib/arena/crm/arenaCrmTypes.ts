/**
 * Read-only CRM агрегаты по Arena / live-training (без записи, без LLM).
 */

import type { ArenaCoachDecisionDto } from "@/lib/arena/decision/arenaCoachDecisionTypes";
import type { ArenaObservationInterpretation } from "@/lib/arena/interpretation/arenaInterpretationTypes";

export type ArenaPlayerTrend = "up" | "stable" | "down";

export type ArenaPlayerSnapshot = {
  recentSignals: number;
  positiveCount: number;
  attentionCount: number;
  trend: ArenaPlayerTrend;
  repeatedConcerns: number;
};

export type ArenaGroupSnapshot = {
  players: number;
  attentionPlayers: number;
  strongPlayers: number;
  unstablePlayers: number;
};

export type ArenaTeamSnapshot = {
  totalPlayers: number;
  attentionZones: string[];
  dominantStrengths: string[];
};

/** Pass 9: operational focus lines from supercore (latest confirmed live session for team). */
export type ArenaCrmSupercoreOperationalFocusLine = {
  title: string;
  body: string;
  liveTrainingSessionId: string;
  bindingDecisionId: string;
};

export type ArenaCrmSnapshot = {
  player?: ArenaPlayerSnapshot;
  group?: ArenaGroupSnapshot;
  team?: ArenaTeamSnapshot;
  /**
   * Supercore-backed focus decisions (`ArenaActionEnvelope` → CRM adapter) for the team’s
   * most recent confirmed `LiveTrainingSession`. Omitted when empty or unavailable.
   */
  supercoreOperationalFocus?: ArenaCrmSupercoreOperationalFocusLine[];
};

/** Единичное наблюдение для детерминированной агрегации (черновик + опционально сигнал). */
export type ArenaCrmDraftSlice = {
  playerId: string | null;
  interpretation?: ArenaObservationInterpretation | null;
  coachDecision?: ArenaCoachDecisionDto | null;
  /** Значение enum Prisma `LiveTrainingObservationSentiment` как строка. */
  sentiment: string;
  signal?: {
    metricDomain: string;
    signalDirection: string;
  } | null;
};

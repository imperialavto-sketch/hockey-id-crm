/**
 * Offline session bundle — structural types for locally persisted sync-shaped payloads.
 * No network calls; JSON shape stable for AsyncStorage (`frozenSyncBundles`).
 */

import type { SkillType, Trend } from "./playerDevelopment";
import type { ObservationImpact } from "./sessionObservation";

/** Sync-ready observation (no client id) */
export interface SyncedSessionObservation {
  playerId: string;
  playerName: string;
  skillType: SkillType;
  impact: ObservationImpact;
  note?: string;
  createdAt: number;
}

/** Completed session payload for sync */
export interface CoachSessionSyncPayload {
  sessionId: string;
  title: string;
  startedAt: number;
  endedAt: number;
  observations: SyncedSessionObservation[];
  playerCount: number;
  observationCount: number;
}

/** Per-skill snapshot for sync */
export interface PlayerSkillSnapshotItem {
  skillType: SkillType;
  score: number;
  trend: Trend;
  confidence: number;
}

/** Player development snapshot for sync */
export interface PlayerSkillSnapshotPayload {
  playerId: string;
  skills: PlayerSkillSnapshotItem[];
  lastUpdatedAt?: number;
}

/** Parent-facing draft payload for sync */
export interface ParentDraftPayload {
  sessionId: string;
  playerId: string;
  playerName: string;
  headline: string;
  parentMessage: string;
  positives: string[];
  improvementAreas: string[];
  focusSkills: SkillType[];
}

/** Full bundle for one completed session (offline storage / legacy sync shape) */
export interface OfflineSessionBundlePayload {
  session: CoachSessionSyncPayload;
  playerSnapshots: PlayerSkillSnapshotPayload[];
  parentDrafts: ParentDraftPayload[];
}

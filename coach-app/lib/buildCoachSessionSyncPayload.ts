/**
 * Coach Session Sync — pure mapping from local data to backend-ready payloads.
 * No storage. No network. Deterministic only.
 */

import { SkillType } from "@/models/playerDevelopment";
import type { PlayerSkillsMap } from "@/models/playerDevelopment";
import type { CompletedTrainingSession, SessionObservation } from "@/models/sessionObservation";
import { buildParentSummariesForSession } from "@/lib/parentSessionSummaryHelpers";
import type {
  CoachSessionSyncPayload,
  SyncedSessionObservation,
  PlayerSkillSnapshotPayload,
  PlayerSkillSnapshotItem,
  ParentDraftPayload,
  CoachSessionBundlePayload,
} from "@/models/coachSessionSync";

const ALL_SKILL_TYPES = Object.values(SkillType) as SkillType[];

/** Map a session observation to sync shape (strips client id) */
function toSyncedObservation(obs: SessionObservation): SyncedSessionObservation {
  return {
    playerId: obs.playerId,
    playerName: obs.playerName,
    skillType: obs.skillType,
    impact: obs.impact,
    note: obs.note,
    createdAt: obs.createdAt,
  };
}

/** Map completed session to CoachSessionSyncPayload */
export function mapCompletedSessionToSyncPayload(
  session: CompletedTrainingSession
): CoachSessionSyncPayload {
  const observations = session.observations.map(toSyncedObservation);
  const playerIds = new Set(session.observations.map((o) => o.playerId));
  return {
    sessionId: session.id,
    title: session.title,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    observations,
    playerCount: playerIds.size,
    observationCount: observations.length,
  };
}

/** Map PlayerSkillsMap to array of skill items */
function skillsMapToItems(skills: PlayerSkillsMap): PlayerSkillSnapshotItem[] {
  return ALL_SKILL_TYPES.map((skillType) => {
    const s = skills[skillType];
    return {
      skillType,
      score: s.score,
      trend: s.trend,
      confidence: s.confidence,
    };
  });
}

/** Map playerDevelopmentById to snapshots for players in the session */
export function mapPlayerDevelopmentToSnapshots(
  playerDevelopmentById: Record<string, PlayerSkillsMap>,
  playerIds: string[],
  lastUpdatedAt?: number
): PlayerSkillSnapshotPayload[] {
  return playerIds.map((playerId) => {
    const skills = playerDevelopmentById[playerId];
    if (!skills) {
      return {
        playerId,
        skills: [],
        lastUpdatedAt,
      };
    }
    return {
      playerId,
      skills: skillsMapToItems(skills),
      lastUpdatedAt,
    };
  });
}

export type EditedParentDraftOverride = { headline: string; parentMessage: string };

/**
 * Map generated parent drafts to payloads, applying edited overrides.
 * - positives, improvementAreas, focusSkills: from deterministic generation
 * - headline, parentMessage: use edited values if present, else generated
 */
export function mapParentDraftsToPayloads(
  sessionId: string,
  observations: SessionObservation[],
  editedOverrides: Record<string, EditedParentDraftOverride>
): ParentDraftPayload[] {
  const summaries = buildParentSummariesForSession(observations);
  return summaries.map((s) => {
    const key = `${sessionId}_${s.playerId}`;
    const edited = editedOverrides[key];
    return {
      sessionId,
      playerId: s.playerId,
      playerName: s.playerName,
      headline: edited?.headline ?? s.headline,
      parentMessage: edited?.parentMessage ?? s.parentMessage,
      positives: s.positives,
      improvementAreas: s.improvementAreas,
      focusSkills: s.focusSkills,
    };
  });
}

/**
 * Build full CoachSessionBundlePayload for a completed session.
 *
 * @example
 * const bundle = buildCoachSessionBundlePayload(
 *   completedSession,
 *   playerDevelopmentById,
 *   editedParentDrafts
 * );
 * // future: await api.post('/coach/sessions/sync', bundle);
 */
export function buildCoachSessionBundlePayload(
  session: CompletedTrainingSession,
  playerDevelopmentById: Record<string, PlayerSkillsMap>,
  editedParentDrafts: Record<string, EditedParentDraftOverride>
): CoachSessionBundlePayload {
  const sessionPayload = mapCompletedSessionToSyncPayload(session);
  const playerIds = [...new Set(session.observations.map((o) => o.playerId))];
  const playerSnapshots = mapPlayerDevelopmentToSnapshots(
    playerDevelopmentById,
    playerIds,
    session.endedAt
  );
  const parentDrafts = mapParentDraftsToPayloads(
    session.id,
    session.observations,
    editedParentDrafts
  );

  return {
    session: sessionPayload,
    playerSnapshots,
    parentDrafts,
  };
}

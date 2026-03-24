/**
 * Recalculate player development from observations.
 * Used for Undo / Edit to keep playerDevelopmentById consistent.
 */

import {
  createDefaultPlayerSkills,
  applySkillUpdate,
  type PlayerSkillsMap,
  type SkillType,
} from "@/models/playerDevelopment";
import type { SessionObservation } from "@/models/sessionObservation";
import { getCoachSessionPlayers } from "@/lib/getCoachSessionPlayers";

/**
 * Rebuild playerDevelopmentById from scratch using observations.
 * Applies observations in chronological order (oldest first).
 * Observations array is newest-first, so we reverse for chronological order.
 */
export function recalculatePlayerDevelopmentFromObservations(
  observations: SessionObservation[]
): Record<string, PlayerSkillsMap> {
  const players = getCoachSessionPlayers();
  const result: Record<string, PlayerSkillsMap> = {};

  for (const p of players) {
    result[p.id] = createDefaultPlayerSkills();
  }

  const chronological = [...observations].reverse();
  for (const obs of chronological) {
    const skills = result[obs.playerId] ?? createDefaultPlayerSkills();
    result[obs.playerId] = applySkillUpdate(
      skills,
      obs.skillType as SkillType,
      obs.impact
    );
  }

  return result;
}

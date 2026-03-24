/**
 * Recent Combos — builds list of recent player+skill pairs from observations
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";

export interface RecentCombo {
  playerId: string;
  playerName: string;
  skillType: SkillType;
}

const MAX_RECENT_COMBOS = 5;

function comboKey(playerId: string, skillType: SkillType): string {
  return `${playerId}:${skillType}`;
}

/**
 * Build list of unique player+skill combos from observations, ordered by recency.
 * Most recently used combo first. Returns up to 5 combos.
 */
export function getRecentCombosFromObservations(
  observations: SessionObservation[]
): RecentCombo[] {
  const seen = new Set<string>();
  const result: RecentCombo[] = [];

  for (const obs of observations) {
    const key = comboKey(obs.playerId, obs.skillType);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      playerId: obs.playerId,
      playerName: obs.playerName,
      skillType: obs.skillType,
    });
    if (result.length >= MAX_RECENT_COMBOS) break;
  }

  return result;
}

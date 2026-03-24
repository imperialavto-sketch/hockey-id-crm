/**
 * Recent Players — builds list of recently used players from session observations
 */

import type { SessionObservation } from "@/models/sessionObservation";

export interface RecentPlayer {
  playerId: string;
  playerName: string;
}

const MAX_RECENT_PLAYERS = 5;

/**
 * Build list of unique players from observations, ordered by recency.
 * Most recently used player first. Returns up to 5 players.
 */
export function getRecentPlayersFromObservations(
  observations: SessionObservation[]
): RecentPlayer[] {
  const seen = new Set<string>();
  const result: RecentPlayer[] = [];

  for (const obs of observations) {
    if (seen.has(obs.playerId)) continue;
    seen.add(obs.playerId);
    result.push({ playerId: obs.playerId, playerName: obs.playerName });
    if (result.length >= MAX_RECENT_PLAYERS) break;
  }

  return result;
}

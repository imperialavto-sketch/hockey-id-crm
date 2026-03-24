/**
 * Coach Session — player source abstraction
 *
 * Uses cache from Players tab (real API) when available.
 * Production: returns [] if cache empty. Dev: falls back to mock.
 */

import { getCoachPlayersCache } from "@/lib/coachPlayersCache";
import { isProduction } from "@/lib/config";
import { PLAYER_DETAIL_MOCK } from "@/constants/playerDetailData";
import { MOCK_COACH_PLAYERS } from "@/data/mockCoachPlayers";

export interface CoachSessionPlayer {
  id: string;
  name: string;
  jerseyNumber?: number;
}

/**
 * Get players available for Session Capture.
 * Uses cache (from Players tab API) when populated.
 * Production: [] if cache empty. Dev: mock fallback.
 */
export function getCoachSessionPlayers(): CoachSessionPlayer[] {
  const cached = getCoachPlayersCache();
  if (cached && cached.length > 0) return cached;

  if (isProduction) return [];

  const appPlayers = Object.values(PLAYER_DETAIL_MOCK).map((p) => ({
    id: p.id,
    name: p.name,
    jerseyNumber: p.number,
  }));
  if (appPlayers.length > 0) return appPlayers;
  return MOCK_COACH_PLAYERS.map((p) => ({
    id: p.id,
    name: p.name,
    jerseyNumber: p.jerseyNumber,
  }));
}

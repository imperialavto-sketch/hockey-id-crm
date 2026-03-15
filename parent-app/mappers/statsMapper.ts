import type { PlayerStats } from "@/types";

export interface ApiStats {
  games?: number;
  goals?: number;
  assists?: number;
  points?: number;
  pim?: number;
}

export function mapApiStatsToPlayerStats(api: ApiStats): PlayerStats {
  return {
    games: api.games ?? 0,
    goals: api.goals ?? 0,
    assists: api.assists ?? 0,
    points: api.points ?? 0,
    pim: api.pim ?? 0,
  };
}

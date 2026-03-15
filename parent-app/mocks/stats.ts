import type { PlayerStats } from "@/types";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

const s = PLAYER_MARK_GOLYSH.stats;

export const mockPlayerStats: Record<string, PlayerStats> = {
  [PLAYER_MARK_GOLYSH.id]: {
    games: s.games,
    goals: s.goals,
    assists: s.assists,
    points: s.points,
    pim: s.penalties,
  },
  "1": {
    games: s.games,
    goals: s.goals,
    assists: s.assists,
    points: s.points,
    pim: s.penalties,
  },
};

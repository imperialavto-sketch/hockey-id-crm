import type { Player } from "@/types";
import { PLAYER_MARK_GOLYSH, PLAYER_AGE } from "@/constants/mockPlayerMarkGolysh";

/**
 * Demo players for offline / demo mode.
 * Primary player: Голыш Марк.
 */
const BASE_PLAYER: Player = {
  id: PLAYER_MARK_GOLYSH.id,
  name: PLAYER_MARK_GOLYSH.profile.fullName,
  age: PLAYER_AGE,
  birthYear: PLAYER_MARK_GOLYSH.profile.birthYear,
  team: PLAYER_MARK_GOLYSH.profile.team,
  position: PLAYER_MARK_GOLYSH.profile.position ?? "Нападающий",
  number: PLAYER_MARK_GOLYSH.profile.number,
  parentName: "Юрий Голыш",
  status: "active",
};

export const demoPlayers: Player[] = [BASE_PLAYER];

export function getDemoPlayerById(id: string): Player | null {
  return demoPlayers.find((p) => p.id === id) ?? null;
}


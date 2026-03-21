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
  avatarUrl: PLAYER_MARK_GOLYSH.image,
};

export const demoPlayers: Player[] = [BASE_PLAYER];

/** In-memory list of players added in demo mode. Resets on app restart. */
const demoCreatedPlayers: Player[] = [];

export function getDemoPlayers(): Player[] {
  return [...demoPlayers, ...demoCreatedPlayers];
}

export function addDemoPlayer(player: Player): void {
  demoCreatedPlayers.push(player);
}

export function getDemoPlayerById(id: string): Player | null {
  return getDemoPlayers().find((p) => p.id === id) ?? null;
}


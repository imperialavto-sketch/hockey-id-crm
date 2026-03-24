/**
 * In-memory cache of coach-scoped players.
 * Populated when Players tab loads. Used by getCoachSessionPlayers for Session Capture.
 * Phase 1: optional—when populated, Session Capture uses real players.
 */

import type { CoachSessionPlayer } from "./getCoachSessionPlayers";

let cached: CoachSessionPlayer[] | null = null;

export function setCoachPlayersCache(players: CoachSessionPlayer[]): void {
  cached = players;
}

export function getCoachPlayersCache(): CoachSessionPlayer[] | null {
  return cached;
}

export function clearCoachPlayersCache(): void {
  cached = null;
}

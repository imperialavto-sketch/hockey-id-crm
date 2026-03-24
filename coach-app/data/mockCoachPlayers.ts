/**
 * Mock players — FALLBACK for getCoachSessionPlayers when cache and PLAYER_DETAIL_MOCK are empty.
 * Used only in dev/demo when API is unavailable.
 */

export interface MockCoachPlayer {
  id: string;
  name: string;
  jerseyNumber?: number;
}

export const MOCK_COACH_PLAYERS: MockCoachPlayer[] = [
  { id: "p1", name: "Голыш Марк", jerseyNumber: 7 },
  { id: "p2", name: "Alex Thompson", jerseyNumber: 12 },
  { id: "p3", name: "Marcus Lindqvist", jerseyNumber: 21 },
  { id: "p4", name: "Jake Wilson", jerseyNumber: 9 },
  { id: "p5", name: "Nikolai Petrov", jerseyNumber: 44 },
];

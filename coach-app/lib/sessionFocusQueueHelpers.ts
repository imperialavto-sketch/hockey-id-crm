/**
 * Session Focus Queue — players needing attention in current session
 */

import type { SessionObservation } from "@/models/sessionObservation";
import type { CoachSessionPlayer } from "@/lib/getCoachSessionPlayers";

export type FocusQueueStatus = "none" | "one" | "in_focus";

export interface FocusQueueItem {
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  observationCount: number;
  status: FocusQueueStatus;
  statusLabel: string;
}

const MAX_QUEUE_SIZE = 5;
const IN_FOCUS_THRESHOLD = 2;

export function getSessionFocusQueue(
  players: CoachSessionPlayer[],
  observations: SessionObservation[]
): FocusQueueItem[] {
  const counts = new Map<string, number>();
  for (const obs of observations) {
    counts.set(obs.playerId, (counts.get(obs.playerId) ?? 0) + 1);
  }

  const withCounts = players.map((p) => ({
    player: p,
    count: counts.get(p.id) ?? 0,
  }));

  const needsAttention = withCounts
    .filter((x) => x.count < IN_FOCUS_THRESHOLD)
    .sort((a, b) => a.count - b.count)
    .slice(0, MAX_QUEUE_SIZE);

  return needsAttention.map(({ player, count }) => {
    let status: FocusQueueStatus;
    let statusLabel: string;
    if (count === 0) {
      status = "none";
      statusLabel = "Пока без наблюдений";
    } else if (count === 1) {
      status = "one";
      statusLabel = "Есть 1 наблюдение";
    } else {
      status = "in_focus";
      statusLabel = "Уже в фокусе";
    }

    return {
      playerId: player.id,
      playerName: player.name,
      jerseyNumber: player.jerseyNumber,
      observationCount: count,
      status,
      statusLabel,
    };
  });
}

export function allPlayersInFocus(
  players: CoachSessionPlayer[],
  observations: SessionObservation[]
): boolean {
  if (players.length === 0) return true;
  const counts = new Map<string, number>();
  for (const obs of observations) {
    counts.set(obs.playerId, (counts.get(obs.playerId) ?? 0) + 1);
  }
  return players.every((p) => (counts.get(p.id) ?? 0) >= IN_FOCUS_THRESHOLD);
}

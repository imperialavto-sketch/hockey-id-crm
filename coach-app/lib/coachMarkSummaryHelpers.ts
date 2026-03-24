/**
 * Coach Mark — summary logic for home dashboard.
 * Uses existing report/insight data. No backend.
 */

import { getCoachSessionPlayers } from "./getCoachSessionPlayers";
import { getPlayerReportForPlayer } from "./playerReportHelpers";
import { loadCoachInputState } from "./coachInputStorage";
import type { SessionObservation } from "@/models/sessionObservation";

export interface CoachMarkSummary {
  playerId: string;
  playerName: string;
  status: string;
  insightLine: string;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3).trim() + "...";
}

/**
 * Get player IDs with >= 3 observations.
 */
async function getPlayersWithEnoughObservations(): Promise<string[]> {
  const state = await loadCoachInputState();
  if (!state) return [];

  const counts: Record<string, number> = {};

  const addObs = (obs: SessionObservation) => {
    counts[obs.playerId] = (counts[obs.playerId] ?? 0) + 1;
  };

  for (const session of state.completedSessions) {
    for (const obs of session.observations) addObs(obs);
  }
  if (state.sessionDraft.observations) {
    for (const obs of state.sessionDraft.observations) addObs(obs);
  }

  return Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .map(([id]) => id);
}

/**
 * Get 1–2 short summaries for players with enough observations.
 * Used by Coach Mark block on home.
 */
export async function getCoachMarkSummaries(): Promise<CoachMarkSummary[]> {
  const playerIds = await getPlayersWithEnoughObservations();
  if (playerIds.length === 0) return [];

  const players = getCoachSessionPlayers();
  const nameById = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const results: CoachMarkSummary[] = [];

  for (let i = 0; i < Math.min(2, playerIds.length); i++) {
    const playerId = playerIds[i]!;
    const report = await getPlayerReportForPlayer(playerId);
    if (!report) continue;

    const playerName = nameById[playerId] ?? "Игрок";
    const insightLine =
      report.strengths[0] ?? truncate(report.recommendation, 60);

    results.push({
      playerId,
      playerName,
      status: report.overallLabel,
      insightLine: truncate(insightLine, 70),
    });
  }

  return results;
}

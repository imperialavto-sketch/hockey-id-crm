/**
 * Session Review Center — helpers for post-session summary.
 * Local first; prefers API review when available.
 */

import type { CompletedTrainingSession } from "@/models/sessionObservation";
import type { PersistedCoachInputState } from "./coachInputStorage";
import { loadCoachInputState } from "./coachInputStorage";
import { groupObservationsByPlayer } from "./sessionReviewHelpers";
import { getCoachSessionReview } from "@/services/coachSessionLiveService";

export interface SessionPlayerSummary {
  playerId: string;
  playerName: string;
  observationCountInSession: number;
  /** "Есть вывод" when >= 3 total observations (report threshold) */
  hasInsight: boolean;
  /** Report ready when >= 3 observations */
  hasReport: boolean;
  /** Parent draft ready when report ready */
  hasParentDraft: boolean;
  statusLabel: "Есть вывод" | "Готов отчёт" | "Готово сообщение" | null;
}

export interface SessionReviewSummary {
  session: CompletedTrainingSession | null;
  observationCount: number;
  uniquePlayers: number;
  reportsReady: number;
  draftsReady: number;
  players: SessionPlayerSummary[];
}

function collectPlayerObservations(
  state: PersistedCoachInputState,
  playerId: string
): number {
  let count = 0;
  for (const session of state.completedSessions) {
    for (const obs of session.observations) {
      if (obs.playerId === playerId) count++;
    }
  }
  if (state.sessionDraft?.observations) {
    for (const obs of state.sessionDraft.observations) {
      if (obs.playerId === playerId) count++;
    }
  }
  return count;
}

/** Get last completed session from state */
export function getLastCompletedSession(
  state: PersistedCoachInputState | null
): CompletedTrainingSession | null {
  if (!state?.completedSessions?.length) return null;
  return state.completedSessions[0] ?? null;
}

/** Build full session review summary from state */
export function buildSessionReviewSummary(
  state: PersistedCoachInputState | null
): SessionReviewSummary {
  const session = getLastCompletedSession(state);
  if (!session) {
    return {
      session: null,
      observationCount: 0,
      uniquePlayers: 0,
      reportsReady: 0,
      draftsReady: 0,
      players: [],
    };
  }

  const grouped = groupObservationsByPlayer(session.observations);
  const observationCount = session.observations.length;
  const uniquePlayers = grouped.length;

  const players: SessionPlayerSummary[] = grouped.map((g) => {
    const obsInSession = g.observations.length;
    const totalObs = state ? collectPlayerObservations(state, g.playerId) : obsInSession;
    const hasInsight = totalObs >= 3;
    const hasReport = hasInsight;
    const hasParentDraft = hasInsight;

    let statusLabel: SessionPlayerSummary["statusLabel"] = null;
    if (hasParentDraft) statusLabel = "Готово сообщение";
    else if (hasReport) statusLabel = "Готов отчёт";
    else if (hasInsight) statusLabel = "Есть вывод";

    return {
      playerId: g.playerId,
      playerName: g.playerName,
      observationCountInSession: obsInSession,
      hasInsight,
      hasReport,
      hasParentDraft,
      statusLabel,
    };
  });

  const reportsReady = players.filter((p) => p.hasReport).length;
  const draftsReady = players.filter((p) => p.hasParentDraft).length;

  return {
    session,
    observationCount,
    uniquePlayers,
    reportsReady,
    draftsReady,
    players,
  };
}

function mapApiReviewToSummary(
  api: NonNullable<Awaited<ReturnType<typeof getCoachSessionReview>>>,
  localSession: CompletedTrainingSession,
  localSummary: SessionReviewSummary
): SessionReviewSummary {
  const obsCount = api.observationsCount ?? localSession.observations.length;
  const playersCount = api.playersCount ?? new Set(localSession.observations.map((o) => o.playerId)).size;

  const recent = api.recentObservations ?? [];
  const byPlayer = new Map<string, { name: string; count: number }>();
  for (const o of recent) {
    const cur = byPlayer.get(o.playerId);
    if (cur) {
      cur.count++;
    } else {
      byPlayer.set(o.playerId, { name: o.playerName ?? "Игрок", count: 1 });
    }
  }

  const players: SessionPlayerSummary[] = Array.from(byPlayer.entries()).map(
    ([playerId, { name, count }]) => {
      const hasInsight = count >= 3;
      const hasReport = hasInsight;
      const hasParentDraft = hasInsight;
      let statusLabel: SessionPlayerSummary["statusLabel"] = null;
      if (hasParentDraft) statusLabel = "Готово сообщение";
      else if (hasReport) statusLabel = "Готов отчёт";
      else if (hasInsight) statusLabel = "Есть вывод";
      return {
        playerId,
        playerName: name,
        observationCountInSession: count,
        hasInsight,
        hasReport,
        hasParentDraft,
        statusLabel,
      };
    }
  );

  const reportsReady = players.filter((p) => p.hasReport).length;
  const draftsReady = players.filter((p) => p.hasParentDraft).length;

  return {
    session: localSession,
    observationCount: obsCount,
    uniquePlayers: playersCount,
    reportsReady,
    draftsReady,
    players: players.length > 0 ? players : localSummary.players,
  };
}

/** Load state and build session review summary. Prefers API when available. */
export async function loadSessionReviewSummary(): Promise<SessionReviewSummary> {
  const state = await loadCoachInputState();
  const local = buildSessionReviewSummary(state);
  const session = getLastCompletedSession(state);
  if (!session?.id) return local;

  const api = await getCoachSessionReview(session.id);
  if (!api) return local;

  return mapApiReviewToSummary(api, session, local);
}

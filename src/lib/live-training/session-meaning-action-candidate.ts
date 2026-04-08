/**
 * Кандидат задачи из SessionMeaning.nextActions (MVP: одна строка) + слияние с кандидатами по сигналам.
 */

import type { SessionMeaning } from "./session-meaning";
import type { LiveTrainingActionCandidateDto } from "./live-training-action-candidate-types";
import { sortLiveTrainingActionCandidates } from "./live-training-action-candidate-rules";
import { buildLiveTrainingSessionActionCandidates } from "./build-live-training-session-action-candidates";
import type { LiveTrainingSessionOutcomeDto } from "./live-training-session-outcome";
import {
  getPlayerZeroFollowUpWhenDistinctFromTeam,
  pickSessionMeaningFollowUpMvpLine,
  sessionMeaningFollowUpCandidateId,
  type SessionMeaningNextActionsMin,
} from "@shared/live-training/session-meaning-follow-up-task";

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

const TITLE_MAX = 200;

function toNextActionsMin(
  next: SessionMeaning["nextActions"] | null | undefined
): SessionMeaningNextActionsMin | null {
  if (!next) return null;
  return {
    team: Array.isArray(next.team) ? next.team : [],
    players: Array.isArray(next.players) ? next.players : [],
  };
}

export function buildSessionMeaningFollowUpMvpCandidateDto(
  sessionId: string,
  sessionStartedAt: string,
  outcome: LiveTrainingSessionOutcomeDto,
  nextActions: SessionMeaning["nextActions"] | null | undefined
): LiveTrainingActionCandidateDto | null {
  const min = toNextActionsMin(nextActions);
  const pick = pickSessionMeaningFollowUpMvpLine(min);
  if (!pick) return null;
  const id = sessionMeaningFollowUpCandidateId(sessionId, pick);
  return {
    id,
    playerId: pick.kind === "player" ? pick.playerId : null,
    playerName: pick.kind === "team" ? "Команда" : pick.playerName,
    source: "live_training",
    actionType: "follow_up_check",
    title: truncate(pick.line, TITLE_MAX),
    body: pick.line,
    tone: "neutral",
    priority: "medium",
    basedOn: {
      signalCount: outcome.signalsCreatedCount,
      domains: [...outcome.topDomains],
      lastSessionAt: sessionStartedAt,
    },
  };
}

export function buildPlayerZeroDistinctTeamMeaningCandidateDto(
  sessionId: string,
  sessionStartedAt: string,
  outcome: LiveTrainingSessionOutcomeDto,
  nextActions: SessionMeaning["nextActions"] | null | undefined
): LiveTrainingActionCandidateDto | null {
  const min = toNextActionsMin(nextActions);
  const row = getPlayerZeroFollowUpWhenDistinctFromTeam(sessionId, min);
  if (!row) return null;
  return {
    id: row.candidateId,
    playerId: row.playerId,
    playerName: row.playerName,
    source: "live_training",
    actionType: "follow_up_check",
    title: truncate(row.line, TITLE_MAX),
    body: row.line,
    tone: "neutral",
    priority: "medium",
    basedOn: {
      signalCount: outcome.signalsCreatedCount,
      domains: [...outcome.topDomains],
      lastSessionAt: sessionStartedAt,
    },
  };
}

function appendMeaningDerivedCandidates(
  fromSignals: LiveTrainingActionCandidateDto[],
  sessionId: string,
  sessionStartedAt: string,
  outcome: LiveTrainingSessionOutcomeDto,
  nextActions: SessionMeaning["nextActions"] | null | undefined
): LiveTrainingActionCandidateDto[] {
  const merged = [...fromSignals];
  const pushIfNew = (c: LiveTrainingActionCandidateDto | null) => {
    if (!c) return;
    if (merged.some((i) => i.id === c.id)) return;
    merged.push(c);
  };
  pushIfNew(buildSessionMeaningFollowUpMvpCandidateDto(sessionId, sessionStartedAt, outcome, nextActions));
  pushIfNew(buildPlayerZeroDistinctTeamMeaningCandidateDto(sessionId, sessionStartedAt, outcome, nextActions));
  return merged;
}

/** Для GET action-candidates: до 7 позиций (сигналы + team MVP + player:0 при отличии от team). */
export function listLiveTrainingSessionActionCandidatesWithMeaningMvp(
  outcome: LiveTrainingSessionOutcomeDto,
  sessionId: string,
  sessionStartedAt: string,
  nextActions: SessionMeaning["nextActions"] | null | undefined
): LiveTrainingActionCandidateDto[] {
  const fromSignals = buildLiveTrainingSessionActionCandidates(outcome, sessionId, sessionStartedAt);
  const merged = appendMeaningDerivedCandidates(
    fromSignals,
    sessionId,
    sessionStartedAt,
    outcome,
    nextActions
  );
  if (merged.length === fromSignals.length) return fromSignals;
  return sortLiveTrainingActionCandidates(merged, 7);
}

/** Для materialize: полный список без обрезки, чтобы кандидат из смысла всегда находился по id. */
export function listLiveTrainingSessionActionCandidatesForMaterialize(
  outcome: LiveTrainingSessionOutcomeDto,
  sessionId: string,
  sessionStartedAt: string,
  nextActions: SessionMeaning["nextActions"] | null | undefined
): LiveTrainingActionCandidateDto[] {
  const fromSignals = buildLiveTrainingSessionActionCandidates(outcome, sessionId, sessionStartedAt);
  return appendMeaningDerivedCandidates(
    fromSignals,
    sessionId,
    sessionStartedAt,
    outcome,
    nextActions
  );
}

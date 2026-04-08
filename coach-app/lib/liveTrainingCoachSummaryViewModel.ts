/**
 * Post-session coach digest: rule-based summary from outcome, continuity, action candidates (no LLM).
 */

import { formatLiveTrainingMetricDomain } from "@/lib/liveTrainingMetricDomainLabel";
import type { LiveTrainingActionCandidate } from "@/services/liveTrainingService";
import type { LiveTrainingContinuitySnapshot, LiveTrainingSessionOutcome } from "@/types/liveTraining";

export type CoachPostSessionPlayerLine = {
  playerId: string;
  playerName: string;
  reason: string;
};

export type CoachPostSessionSuggestedAction = {
  kind: "player_task" | "group_focus" | "next_session_carry";
  title: string;
  subtitle?: string;
};

/** Компактный контракт для экрана complete / post-confirm. */
export type LiveTrainingCoachPostSessionSummary = {
  totalObservations: number;
  playerObservationCount: number;
  teamObservationCount: number;
  sessionObservationCount: number;
  needsReviewCount: number;
  playersNeedingAttention: CoachPostSessionPlayerLine[];
  playersPositive: CoachPostSessionPlayerLine[];
  topThemes: string[];
  carryForwardFocus: string[];
  suggestedActions: CoachPostSessionSuggestedAction[];
};

function shortName(full: string): string {
  const t = full.trim().split(/\s+/)[0];
  return t || full;
}

/**
 * Агрегация и эвристики поверх уже посчитанного outcome и continuity lock-in.
 */
export function buildLiveTrainingCoachPostSessionSummary(input: {
  outcome: LiveTrainingSessionOutcome;
  continuitySnapshot?: LiveTrainingContinuitySnapshot | null;
  actionCandidates?: LiveTrainingActionCandidate[];
}): LiveTrainingCoachPostSessionSummary {
  const { outcome, continuitySnapshot, actionCandidates = [] } = input;

  const playersNeedingAttention = [...outcome.topPlayers]
    .filter(
      (p) =>
        p.negativeCount > 0 ||
        (p.totalSignals > 0 && p.negativeCount > p.positiveCount)
    )
    .sort((a, b) => b.negativeCount - a.negativeCount || b.totalSignals - a.totalSignals)
    .slice(0, 4)
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      reason:
        p.negativeCount > 0
          ? `Минусов: ${p.negativeCount}${p.positiveCount ? ` · плюс: ${p.positiveCount}` : ""}`
          : "Баланс на контроле",
    }));

  const playersPositive = [...outcome.topPlayers]
    .filter((p) => p.positiveCount > 0 && p.positiveCount >= p.negativeCount)
    .sort((a, b) => b.positiveCount - a.positiveCount)
    .slice(0, 4)
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      reason: `Плюсов: ${p.positiveCount}`,
    }));

  const topThemes = outcome.topDomains.slice(0, 4).map((d) => formatLiveTrainingMetricDomain(d));

  const carryForwardFocus: string[] = [];
  if (continuitySnapshot) {
    for (const pl of continuitySnapshot.carriedFocusPlayers.slice(0, 2)) {
      const r = pl.reason?.trim();
      carryForwardFocus.push(
        r && r.length < 88
          ? `${shortName(pl.playerName)}: ${r}`
          : `Игрок: ${shortName(pl.playerName)}`
      );
    }
    for (const d of continuitySnapshot.carriedDomains.slice(0, 2)) {
      const label = d.labelRu?.trim() || formatLiveTrainingMetricDomain(d.domain);
      const r = d.reason?.trim();
      carryForwardFocus.push(r && r.length < 80 ? `${label} — ${r}` : label);
    }
    if (carryForwardFocus.length === 0 && continuitySnapshot.summaryLines?.length) {
      carryForwardFocus.push(...continuitySnapshot.summaryLines.slice(0, 2));
    }
  }

  const suggestedActions: CoachPostSessionSuggestedAction[] = [];
  for (const c of actionCandidates) {
    if (c.isMaterialized) continue;
    const body = c.body.trim();
    suggestedActions.push({
      kind: "player_task",
      title: c.title.trim(),
      subtitle: `${shortName(c.playerName)}${body ? ` — ${body.length > 64 ? `${body.slice(0, 61)}…` : body}` : ""}`,
    });
    if (suggestedActions.length >= 4) break;
  }

  if (carryForwardFocus.length > 0) {
    suggestedActions.push({
      kind: "next_session_carry",
      title: "Перенести фокус в следующий старт",
      subtitle: carryForwardFocus[0],
    });
  }

  if (outcome.teamObservationCount > 0 || outcome.sessionObservationCount > 0) {
    suggestedActions.push({
      kind: "group_focus",
      title: "Заложить работу с пятёркой / сессией",
      subtitle: `Записей: пятёрка ${outcome.teamObservationCount}, сессия ${outcome.sessionObservationCount}`,
    });
  }

  return {
    totalObservations: outcome.includedDraftsCount,
    playerObservationCount: outcome.playerObservationCount,
    teamObservationCount: outcome.teamObservationCount,
    sessionObservationCount: outcome.sessionObservationCount,
    needsReviewCount: outcome.draftsFlaggedNeedsReview,
    playersNeedingAttention,
    playersPositive,
    topThemes,
    carryForwardFocus: carryForwardFocus.slice(0, 4),
    suggestedActions: suggestedActions.slice(0, 6),
  };
}

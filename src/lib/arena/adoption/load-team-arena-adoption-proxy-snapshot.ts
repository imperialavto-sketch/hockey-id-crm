/**
 * Internal read model: compact Arena adoption / value **proxies** for one team + time window.
 * No new tables, events, or UI — only existing persisted rows the product already writes.
 *
 * Scope: **team** (aligns with live training + CRM team/player flows tied to `teamId`).
 */

import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TeamArenaAdoptionWindow = {
  from: Date;
  to: Date;
};

/**
 * Counts only — safe for internal audits / scripts. Field names match DB intent, not finance “ROI”.
 */
export type TeamArenaAdoptionProxySnapshot = {
  teamId: string;
  windowStartIso: string;
  windowEndIso: string;
  /** `LiveTrainingSession` confirmed for team, `confirmedAt` in window. */
  confirmedLiveSessionsInWindow: number;
  /** `LiveTrainingSessionReportDraft.publishedAt` in window (live publish pipeline proxy). */
  liveReportDraftsPublishedInWindow: number;
  /** `LiveTrainingSession.arenaNextFocusAppliedAt` in window (coach/CRM apply-from-live proxy). */
  liveSessionsArenaFocusAppliedInWindow: number;
  /**
   * Team `TrainingSession` rows with non-null `arenaNextTrainingFocus` and `updatedAt` in window.
   * Proxy for slot-level focus text writes (coach app + CRM apply path); not proof of “who” wrote.
   */
  teamTrainingSessionsArenaFocusTouchedInWindow: number;
  /** `ActionItem` with `liveTrainingCandidateId` for roster players (`Player.teamId`), `createdAt` in window. */
  materializedLiveTrainingActionItemsForTeamRosterInWindow: number;
  /** `ExternalTrainingRequest` for roster players, `createdAt` in window (parent external contour proxy). */
  externalTrainingRequestsForTeamRosterInWindow: number;
};

function assertWindow(window: TeamArenaAdoptionWindow): void {
  if (!(window.from instanceof Date) || !(window.to instanceof Date) || Number.isNaN(window.from.getTime()) || Number.isNaN(window.to.getTime())) {
    throw new Error("Arena adoption window: invalid Date bounds");
  }
  if (window.from > window.to) {
    throw new Error("Arena adoption window: from must be <= to");
  }
}

/**
 * Loads proxy counts for `teamId` and `[window.from, window.to]` inclusive on each field’s chosen timestamp.
 */
export async function loadTeamArenaAdoptionProxySnapshot(
  teamId: string,
  window: TeamArenaAdoptionWindow
): Promise<TeamArenaAdoptionProxySnapshot> {
  const tid = teamId.trim();
  if (!tid) {
    throw new Error("Arena adoption snapshot: teamId required");
  }
  assertWindow(window);
  const { from, to } = window;

  const roster = await prisma.player.findMany({
    where: { teamId: tid },
    select: { id: true },
  });
  const rosterIds = roster.map((p) => p.id);

  const [
    confirmedLiveSessionsInWindow,
    liveReportDraftsPublishedInWindow,
    liveSessionsArenaFocusAppliedInWindow,
    teamTrainingSessionsArenaFocusTouchedInWindow,
  ] = await Promise.all([
    prisma.liveTrainingSession.count({
      where: {
        teamId: tid,
        status: LiveTrainingSessionStatus.confirmed,
        confirmedAt: { gte: from, lte: to },
      },
    }),
    prisma.liveTrainingSessionReportDraft.count({
      where: {
        teamId: tid,
        publishedAt: { not: null, gte: from, lte: to },
      },
    }),
    prisma.liveTrainingSession.count({
      where: {
        teamId: tid,
        arenaNextFocusAppliedAt: { not: null, gte: from, lte: to },
      },
    }),
    prisma.trainingSession.count({
      where: {
        teamId: tid,
        arenaNextTrainingFocus: { not: null },
        updatedAt: { gte: from, lte: to },
      },
    }),
  ]);

  const materializedLiveTrainingActionItemsForTeamRosterInWindow =
    rosterIds.length === 0
      ? 0
      : await prisma.actionItem.count({
          where: {
            liveTrainingCandidateId: { not: null },
            playerId: { in: rosterIds },
            createdAt: { gte: from, lte: to },
          },
        });

  const externalTrainingRequestsForTeamRosterInWindow =
    rosterIds.length === 0
      ? 0
      : await prisma.externalTrainingRequest.count({
          where: {
            playerId: { in: rosterIds },
            createdAt: { gte: from, lte: to },
          },
        });

  return {
    teamId: tid,
    windowStartIso: from.toISOString(),
    windowEndIso: to.toISOString(),
    confirmedLiveSessionsInWindow,
    liveReportDraftsPublishedInWindow,
    liveSessionsArenaFocusAppliedInWindow,
    teamTrainingSessionsArenaFocusTouchedInWindow,
    materializedLiveTrainingActionItemsForTeamRosterInWindow,
    externalTrainingRequestsForTeamRosterInWindow,
  };
}

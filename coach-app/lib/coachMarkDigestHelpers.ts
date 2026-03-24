/**
 * Coach Mark Digest — high-level summary for dashboard.
 * Aggregates coach insight, actions, reports, parent drafts. No backend.
 */

import { getCoachActionItems } from "./coachActionHelpers";
import { getWeeklyReadyReports } from "./weeklyReportHelpers";
import { getParentDrafts } from "./parentDraftHelpers";
import { loadCoachInputState } from "./coachInputStorage";
import { countImpacts } from "./sessionReviewHelpers";
import type { SessionObservation } from "@/models/sessionObservation";

export interface CoachMarkDigestData {
  progressingCount: number;
  attentionCount: number;
  reportsReadyCount: number;
  parentDraftsReadyCount: number;
  digestLine: string;
  hasData: boolean;
}

async function getPlayerIdsWithEnoughObservations(): Promise<string[]> {
  const state = await loadCoachInputState();
  if (!state) return [];

  const counts: Record<string, number> = {};
  const addObs = (obs: SessionObservation) => {
    counts[obs.playerId] = (counts[obs.playerId] ?? 0) + 1;
  };

  for (const session of state.completedSessions) {
    for (const obs of session.observations) addObs(obs);
  }
  if (state.sessionDraft?.observations) {
    for (const obs of state.sessionDraft.observations) addObs(obs);
  }

  return Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .map(([id]) => id);
}

async function getProgressingCount(): Promise<number> {
  const state = await loadCoachInputState();
  if (!state) return 0;

  const playerIds = await getPlayerIdsWithEnoughObservations();
  let count = 0;

  for (const playerId of playerIds) {
    const allObs: SessionObservation[] = [];
    for (const session of state.completedSessions) {
      for (const obs of session.observations) {
        if (obs.playerId === playerId) allObs.push(obs);
      }
    }
    if (state.sessionDraft?.observations) {
      for (const obs of state.sessionDraft.observations) {
        if (obs.playerId === playerId) allObs.push(obs);
      }
    }
    const counts = countImpacts(allObs);
    if (counts.positive > counts.negative) {
      count++;
    }
  }

  return count;
}

function pluralPlayer(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "игрок";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "игрока";
  return "игроков";
}

function pluralReport(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "отчёт";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "отчёта";
  return "отчётов";
}

function pluralDraft(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "черновик";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "черновика";
  return "черновиков";
}

function buildDigestLine(data: {
  progressingCount: number;
  attentionCount: number;
  reportsReadyCount: number;
  parentDraftsReadyCount: number;
}): string {
  const parts: string[] = [];
  if (data.progressingCount > 0) {
    parts.push(
      `${data.progressingCount} ${pluralPlayer(data.progressingCount)} прогрессируют`
    );
  }
  if (data.attentionCount > 0) {
    const n = data.attentionCount;
    const p = pluralPlayer(n);
    const verb = n === 1 ? "требует" : "требуют";
    parts.push(`${n} ${p} ${verb} внимания`);
  }
  if (data.reportsReadyCount > 0) {
    parts.push(`${data.reportsReadyCount} ${pluralReport(data.reportsReadyCount)} готовы`);
  }
  if (data.parentDraftsReadyCount > 0) {
    parts.push(
      `${data.parentDraftsReadyCount} ${pluralDraft(data.parentDraftsReadyCount)} родителям`
    );
  }
  if (parts.length === 0) return "";
  return parts.join(", ") + ".";
}

/**
 * Load digest data for dashboard. Uses existing helpers.
 */
export async function loadCoachMarkDigest(): Promise<CoachMarkDigestData> {
  let reports: Awaited<ReturnType<typeof getWeeklyReadyReports>> = [];
  let drafts: Awaited<ReturnType<typeof getParentDrafts>> = [];
  let actionItems: Awaited<ReturnType<typeof getCoachActionItems>> = [];
  try {
    reports = await getWeeklyReadyReports();
  } catch {
    /* fallback to [] when API unavailable */
  }
  try {
    drafts = await getParentDrafts();
  } catch {
    /* fallback to [] when API unavailable */
  }
  try {
    actionItems = await getCoachActionItems();
  } catch {
    /* fallback to [] when API unavailable */
  }
  const [progressingCount] = await Promise.all([getProgressingCount()]);

  const attentionCount = actionItems.length;
  const reportsReadyCount = reports.length;
  const parentDraftsReadyCount = drafts.length;

  const digestLine = buildDigestLine({
    progressingCount,
    attentionCount,
    reportsReadyCount,
    parentDraftsReadyCount,
  });

  const hasData =
    progressingCount > 0 ||
    attentionCount > 0 ||
    reportsReadyCount > 0 ||
    parentDraftsReadyCount > 0;

  return {
    progressingCount,
    attentionCount,
    reportsReadyCount,
    parentDraftsReadyCount,
    digestLine,
    hasData,
  };
}

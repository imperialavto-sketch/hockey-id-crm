/**
 * Coach Players API — coach-scoped players.
 * GET /api/coach/players
 * GET /api/coach/players/:id
 */

import { apiFetch } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";

// --- DTO mirrors (server `src/lib` / `src/app/api/coach/players/*`) ---

export type PlayerDevelopmentInsightDto = {
  recurringThemes: string[];
  recentFocus: string[];
  attentionSignals: string[];
  momentum: "up" | "stable" | "mixed";
  confidence: "low" | "moderate" | "high";
  summaryLine?: string;
};

export type CoachPlayerStoryItemType =
  | "training_summary"
  | "positive_signal"
  | "focus_area"
  | "trend_note";

export type CoachPlayerStoryItemTone = "positive" | "neutral" | "attention";

export type CoachPlayerStoryItem = {
  type: CoachPlayerStoryItemType;
  date: string | null;
  title: string;
  body: string;
  tone: CoachPlayerStoryItemTone;
};

export type CoachPlayerStory = {
  items: CoachPlayerStoryItem[];
  lowData: boolean;
};

export type TrendDomainCountDto = {
  metricDomain: string;
  domainLabelRu: string;
  count: number;
};

export type RepeatedAttentionDto = {
  metricDomain: string;
  domainLabelRu: string;
  negativeCount: number;
};

export type TimelineSessionItemDto = {
  sessionId: string;
  sessionMode: string;
  startedAt: string | null;
  endedAt: string | null;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topDomains: TrendDomainCountDto[];
  lastSignalAt: string;
};

export type TrendSummaryDto = {
  recentSignalsCount: number;
  recentSessionCount: number;
  dominantPositiveDomains: TrendDomainCountDto[];
  dominantNegativeDomains: TrendDomainCountDto[];
  repeatedAttentionAreas: RepeatedAttentionDto[];
  insufficientForPatterns: boolean;
};

/** Alias for UI — matches `PlayerLiveTrainingSignalItemDto` JSON from server. */
export type PlayerLiveTrainingSignalItem = {
  id: string;
  liveTrainingSessionId: string;
  sessionMode: string;
  sessionStartedAt: string | null;
  sessionConfirmedAt: string | null;
  createdAt: string;
  evidenceText: string;
  metricDomain: string;
  metricKey: string;
  signalDirection: string;
  domainLabelRu: string;
  topicLabelRu: string;
  directionLabelRu: string;
};

export type PlayerLiveTrainingSignalsBundle = {
  summary: {
    totalSignals: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    lastSignalAt: string | null;
    lastSessionId: string | null;
    domainBuckets: Array<{ metricDomain: string; domainLabelRu: string; count: number }>;
  };
  trendSummary: TrendSummaryDto;
  timeline: TimelineSessionItemDto[];
  latestSignals: PlayerLiveTrainingSignalItem[];
  recentEvidenceWindowMaxSignals: number;
  recentEvidenceSlices: Array<{
    metricDomain: string;
    metricKey: string;
    signalCount: number;
    positiveCount: number;
    negativeCount: number;
    lastSignalAt: string;
  }>;
};

export type CoachPublishedSessionReportHistoryItem = {
  trainingId: string;
  sessionStartedAt: string;
  teamName: string | null;
  sessionKindLabel: string;
  summaryPreview: string;
  focusAreasPreview: string | null;
  updatedAt: string;
  publishedAt: string | null;
};

export type CoachLiveTrainingActionCandidateType =
  | "follow_up_check"
  | "focus_next_training"
  | "reinforce_positive"
  | "monitor_attention"
  | "monitor_effort"
  | "monitor_technique";

export type CoachLiveTrainingActionCandidate = {
  id: string;
  playerId: string | null;
  playerName: string;
  source: "live_training";
  actionType: CoachLiveTrainingActionCandidateType;
  title: string;
  body: string;
  tone: "positive" | "attention" | "neutral";
  priority: "high" | "medium" | "low";
  basedOn: {
    signalCount: number;
    domains: string[];
    lastSessionAt: string | null;
  };
  /** Present when API enriches candidates with materialization state. */
  isMaterialized?: boolean;
};

export type CoachTrainingSessionReportThemeItem = {
  label: string;
  sessionsCount: number;
};

export type CoachTrainingSessionReportRecentTrend = {
  kind: "improving" | "stable" | "mixed";
  summaryLine: string;
  basedOnSessions: number;
};

export type CoachTrainingSessionReportAttentionItem = {
  label: string;
  sessionsCount: number;
  hint: string;
};

export type CoachTrainingSessionReportActionLayer = {
  priorityActions: string[];
  reinforcementAreas: string[];
  nextSessionFocus: string[];
  confidence: "low" | "moderate" | "high";
  rationale?: string[];
};

export type CoachTaskSuggestion = {
  id: string;
  type: "focus_for_next_session" | "development_note" | "follow_up_check";
  title: string;
  description?: string;
  source: "report_action_layer";
  confidence: "low" | "moderate" | "high";
  priority: "normal" | "elevated";
};

export type CoachTaskSuggestionsFromReports = {
  suggestions: CoachTaskSuggestion[];
  rationale?: string[];
};

/** Response of GET /api/coach/players/:id/report-analytics */
export type CoachTrainingSessionReportAnalytics = {
  reportCount: number;
  dataSufficiency: "none" | "low" | "moderate" | "rich";
  recurringFocusThemes: CoachTrainingSessionReportThemeItem[];
  recentTrend: CoachTrainingSessionReportRecentTrend;
  attentionSignals: CoachTrainingSessionReportAttentionItem[];
  playerHighlightDensity: null;
  caveats: string[];
  actionLayer: CoachTrainingSessionReportActionLayer;
  taskSuggestions: CoachTaskSuggestionsFromReports;
};

export interface CoachPlayerItem {
  id: string;
  name: string;
  number: number;
  position: string;
  team: string;
  teamId: string | null;
  /** Team age group (e.g. U12, U14) for filtering. From Team.ageGroup. */
  teamAgeGroup?: string | null;
  /** Player.groupId + TeamGroup.name when API includes them. */
  groupId?: string | null;
  groupName?: string | null;
  attendance?: string;
  coachNote?: string;
}

export interface CoachPlayerDetail {
  id: string;
  name: string;
  number: number;
  position: string;
  team: string;
  teamId: string | null;
  level: string;
  attendance: { attended: number; total: number; lastSession?: string };
}

const PLAYERS_PATH = "/api/coach/players";

export async function getCoachPlayers(
  teamId?: string,
  groupId?: string | null
): Promise<CoachPlayerItem[]> {
  const headers = await getCoachAuthHeaders();
  const params = new URLSearchParams();
  if (teamId) params.set("teamId", teamId);
  if (groupId?.trim()) params.set("groupId", groupId.trim());
  const qs = params.toString();
  const url = qs ? `${PLAYERS_PATH}?${qs}` : PLAYERS_PATH;
  const raw = await apiFetch<CoachPlayerItem[]>(url, { method: "GET", headers });
  return Array.isArray(raw) ? raw : [];
}

export async function getCoachPlayerDetail(
  playerId: string
): Promise<CoachPlayerDetail | null> {
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<CoachPlayerDetail>(
      `${PLAYERS_PATH}/${encodeURIComponent(playerId)}`,
      { method: "GET", headers }
    );
    return res ?? null;
  } catch {
    return null;
  }
}

export async function fetchCoachPlayerReportAnalytics(
  playerId: string
): Promise<CoachTrainingSessionReportAnalytics | null> {
  try {
    const headers = await getCoachAuthHeaders();
    return await apiFetch<CoachTrainingSessionReportAnalytics>(
      `${PLAYERS_PATH}/${encodeURIComponent(playerId)}/report-analytics`,
      { method: "GET", headers }
    );
  } catch {
    return null;
  }
}

/** GET /api/players/:id/attendance-summary — период по календарным дням UTC (YYYY-MM-DD). */
export interface PlayerAttendanceSummary {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
}

function formatYmdUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Последние `days` календарных дней до сегодня (UTC). */
export function getAttendanceSummaryRangeDays(days: number): {
  fromDate: string;
  toDate: string;
} {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return { fromDate: formatYmdUTC(from), toDate: formatYmdUTC(to) };
}

export async function getPlayerAttendanceSummary(
  playerId: string,
  fromDate: string,
  toDate: string
): Promise<PlayerAttendanceSummary | null> {
  try {
    const headers = await getCoachAuthHeaders();
    const qs = new URLSearchParams({ fromDate, toDate });
    return await apiFetch<PlayerAttendanceSummary>(
      `/api/players/${encodeURIComponent(playerId)}/attendance-summary?${qs.toString()}`,
      { method: "GET", headers }
    );
  } catch {
    return null;
  }
}

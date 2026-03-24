/**
 * Coach Reports API — weekly reports list, player report.
 * Auth: getCoachAuthHeaders (Bearer; dev without token gets 401).
 * GET /api/coach/reports/weekly
 * GET /api/coach/reports/player/:playerId
 */

import { apiFetch, isApi404 } from "@/lib/api";
import { getCoachAuthHeaders } from "@/lib/coachAuth";
import { isEndpointUnavailable, markEndpointUnavailable } from "@/lib/endpointAvailability";
import type { OverallAssessment } from "@/lib/playerReportHelpers";
import type { PlayerReport } from "@/lib/playerReportHelpers";

/** API response for weekly report item */
export interface WeeklyReportApiItem {
  playerId: string;
  playerName: string;
  observationsCount?: number;
  topSkillKeys?: string[];
  shortSummary?: string;
  keyPoints?: string[];
  recommendations?: string[];
  updatedAt?: string;
  ready?: boolean;
  avgScore?: number;
}

/** API response for player report */
export interface PlayerReportApiItem {
  playerId: string;
  playerName: string;
  observationsCount?: number;
  topSkillKeys?: string[];
  shortSummary?: string;
  keyPoints?: string[];
  recommendations?: string[];
  updatedAt?: string;
  ready?: boolean;
  avgScore?: number;
  observations?: Array<{
    id: string;
    skillKey?: string;
    noteType?: string;
    score?: number;
    noteText?: string;
    createdAt?: string;
  }>;
}

/** Map API item to WeeklyReportItem shape (playerId, playerName, summary) */
export function mapWeeklyApiToItem(api: WeeklyReportApiItem): {
  playerId: string;
  playerName: string;
  summary: string;
} {
  const summary =
    api.shortSummary ??
    (Array.isArray(api.keyPoints) && api.keyPoints[0]
      ? api.keyPoints[0]
      : Array.isArray(api.recommendations) && api.recommendations[0]
        ? api.recommendations[0]
        : "—");
  const truncated =
    summary.length > 70 ? summary.slice(0, 67).trim() + "..." : summary;
  return {
    playerId: api.playerId,
    playerName: api.playerName ?? "Игрок",
    summary: truncated,
  };
}

/** Map API player report to UI PlayerReport model */
export function mapPlayerReportApiToUi(api: PlayerReportApiItem): PlayerReport {
  const avgScore = api.avgScore ?? null;
  let overallAssessment: OverallAssessment = "stable";
  let overallLabel = "Стабильное развитие";

  if (avgScore !== null) {
    if (avgScore > 70) {
      overallAssessment = "good";
      overallLabel = "Хороший прогресс";
    } else if (avgScore < 50) {
      overallAssessment = "needs-attention";
      overallLabel = "Требует внимания";
    }
  }

  const keyPoints = Array.isArray(api.keyPoints) ? api.keyPoints : [];
  const recommendations = Array.isArray(api.recommendations)
    ? api.recommendations
    : [];

  const strengths =
    keyPoints.length > 0 ? keyPoints.slice(0, 3) : (api.shortSummary ? [api.shortSummary] : []);
  const growthAreas = keyPoints.length > 3 ? keyPoints.slice(3, 6) : [];
  const recommendation =
    recommendations.length > 0
      ? recommendations.join(" ")
      : api.shortSummary ?? "Продолжайте в том же духе.";

  const period = api.updatedAt
    ? formatPeriod(api.updatedAt)
    : "последние тренировки";

  return {
    period,
    overallAssessment,
    overallLabel,
    overallScore: avgScore,
    strengths: strengths.length > 0 ? strengths : [api.shortSummary ?? "—"].filter(Boolean),
    growthAreas,
    recommendation,
    observationCount: api.observationsCount ?? 0,
  };
}

function formatPeriod(updatedAt: string): string {
  try {
    const d = new Date(updatedAt);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diffDays <= 7) return "последние тренировки";
    if (diffDays <= 14) return "за 2 недели";
    return d.toLocaleDateString("ru-RU", { month: "short", year: "numeric" });
  } catch {
    return "последние тренировки";
  }
}

/**
 * Fetch weekly reports from API.
 * Throws on network/API error so caller can show error + retry.
 * Returns [] when API returns empty array.
 */
const REPORTS_WEEKLY_PATH = "/api/coach/reports/weekly";

export async function getCoachWeeklyReports(): Promise<
  { playerId: string; playerName: string; summary: string }[]
> {
  if (isEndpointUnavailable(REPORTS_WEEKLY_PATH)) return [];
  try {
    const headers = await getCoachAuthHeaders();
    const raw = await apiFetch<WeeklyReportApiItem[]>(REPORTS_WEEKLY_PATH, {
      method: "GET",
      headers,
    });
    const items = Array.isArray(raw) ? raw : [];
    const ready = items.filter((r) => r?.playerId && r.ready !== false);
    return ready.map(mapWeeklyApiToItem);
  } catch (e) {
    if (isApi404(e)) {
      markEndpointUnavailable(REPORTS_WEEKLY_PATH);
      return [];
    }
    throw e;
  }
}

export interface PlayerReportResult {
  report: PlayerReport;
  playerName: string;
}

/**
 * Fetch player report from API.
 * Returns null on error, 404, or ready=false.
 */
const reportsPlayerPrefix = "/api/coach/reports/player/";

export async function getCoachPlayerReport(
  playerId: string
): Promise<PlayerReportResult | null> {
  const path = `${reportsPlayerPrefix}${encodeURIComponent(playerId)}`;
  if (isEndpointUnavailable(path)) return null;
  try {
    const headers = await getCoachAuthHeaders();
    const res = await apiFetch<PlayerReportApiItem | null>(path, {
      method: "GET",
      headers,
    });
    if (!res || res.ready === false) return null;
    return {
      report: mapPlayerReportApiToUi(res),
      playerName: res.playerName ?? "Игрок",
    };
  } catch (e) {
    if (isApi404(e)) markEndpointUnavailable(path);
    return null;
  }
}

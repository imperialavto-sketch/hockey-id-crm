/**
 * Weekly Report Center — list of ready-to-view player reports.
 * Live: prefers API (GET /api/coach/reports/weekly). Falls back to [] on error.
 */

import { getCoachWeeklyReports, type WeeklyReportItem } from "@/services/coachReportsService";

export type { WeeklyReportItem };

/**
 * Get all players with ready Weekly Reports.
 * Uses backend API. Throws on 401/500/network; callers should catch and show error or fallback to [].
 */
export async function getWeeklyReadyReports(): Promise<WeeklyReportItem[]> {
  return getCoachWeeklyReports();
}

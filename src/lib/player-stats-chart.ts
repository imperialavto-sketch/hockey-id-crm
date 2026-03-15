/**
 * Normalizes PlayerStat records for display in the development chart.
 * Returns stats sorted by season ascending (oldest first) for progression view.
 */

export interface ChartStatRow {
  season: string;
  games: number;
  goals: number;
  assists: number;
  points: number;
}

export function normalizeStatsForChart(
  stats: Array<{
    season?: string | null;
    games?: number | null;
    goals?: number | null;
    assists?: number | null;
    points?: number | null;
  }> | null | undefined
): ChartStatRow[] {
  const list = Array.isArray(stats) ? stats : [];
  const rows: ChartStatRow[] = list.map((s) => ({
    season: s?.season ?? "—",
    games: typeof s?.games === "number" ? s.games : 0,
    goals: typeof s?.goals === "number" ? s.goals : 0,
    assists: typeof s?.assists === "number" ? s.assists : 0,
    points: typeof s?.points === "number" ? s.points : 0,
  }));

  rows.reverse();
  return rows;
}

export function getMaxValue(rows: ChartStatRow[] | null | undefined, key: keyof ChartStatRow): number {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) return 1;
  const values = list.map((r) => (key === "season" ? 0 : Number(r?.[key]) ?? 0));
  const max = Math.max(...values);
  return max > 0 ? max : 1;
}

export type ProgressTrend = "up" | "stable" | "down";

export interface PlayerProgressSnapshot {
  id: string;
  playerId: string;
  month: number;
  year: number;
  games: number;
  goals: number;
  assists: number;
  points: number;
  attendancePercent?: number;
  coachComment?: string;
  focusArea?: string;
  trend?: ProgressTrend;
  createdAt?: string;
}

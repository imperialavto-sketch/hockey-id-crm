/**
 * Player context slice shared by Arena helpers and the AI companion thread.
 * Fields are optional when not loaded; populated incrementally by callers.
 *
 * Does not import `playerService` (avoids circular deps). Shapes mirror
 * `LatestSessionEvaluation`, report, attendance, etc. as used in `lib/arena*.ts`.
 */

export interface ArenaParentPlayerContext {
  id: string;
  name?: string;
  age?: number;
  birthYear?: number;
  position?: string;
  team?: string;
  stats?: { games?: number; goals?: number; assists?: number; points?: number };
  aiAnalysis?: {
    summary?: string;
    strengths?: string[];
    growthAreas?: string[];
  };
  latestSessionEvaluation?: {
    effort?: number;
    focus?: number;
    discipline?: number;
    note?: string;
  } | null;
  latestSessionReport?: {
    trainingId?: string;
    summary?: string | null;
    focusAreas?: string | null;
    coachNote?: string | null;
    parentMessage?: string | null;
    updatedAt?: string | null;
  } | null;
  latestLiveTrainingSummary?: {
    trainingSessionId?: string;
    shortSummary?: string;
    highlights?: string[];
    developmentFocus?: string[];
    supportNotes?: string[];
  } | null;
  playerStory?: { trendItems?: string[]; lowData?: boolean } | null;
  evaluationSummary?: {
    totalEvaluations: number;
    avgEffort: number | null;
    avgFocus: number | null;
    avgDiscipline: number | null;
  } | null;
  attendanceSummary?: {
    totalSessions?: number;
    presentCount?: number;
    absentCount?: number;
    attendanceRate?: number;
  } | null;
  coachRecommendations?: string[];
}

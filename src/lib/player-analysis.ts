/**
 * Rule-based hockey player analysis.
 * Generates strengths, weaknesses, and recommendations from player data.
 * No external AI APIs — production-friendly mock analysis.
 */

interface StatInput {
  games: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
}

interface ProfileInput {
  height?: number | null;
  weight?: number | null;
  jerseyNumber?: number | null;
  shoots?: string | null;
}

interface NoteInput {
  note?: string | null;
}

export interface PlayerAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

const SKATING_KEYWORDS = [
  "катани",
  "катание",
  "коньк",
  "скорость",
  "маневренность",
  "маневр",
  "лыжи",
  "ходьба",
  "передвижени",
  "скольжени",
  "слабое катание",
  "медленн",
  "медленный",
];

const SHOOTING_KEYWORDS = [
  "бросок",
  "броск",
  "выстрел",
  "выстрел",
  "прицельн",
  "реализац",
  "голевой момент",
  "удар",
  "завершени",
  "слабая реализация",
  "плохой бросок",
];

function textContainsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function analyzePlayer(
  stat: StatInput | null,
  profile: ProfileInput | null,
  notes: NoteInput[],
  playerComment: string | null | undefined
): PlayerAnalysis {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const hasProfile =
    profile &&
    (profile.height != null ||
      profile.weight != null ||
      profile.jerseyNumber != null ||
      (profile.shoots != null && profile.shoots !== ""));

  const safeNotes = Array.isArray(notes) ? notes : [];
  const allNoteText = [
    ...safeNotes.map((n) => n?.note ?? ""),
    playerComment ?? "",
  ].join(" ");

  // Strengths based on stats
  if (stat) {
    const games = stat?.games ?? 0;
    const goals = stat?.goals ?? 0;
    const assists = stat?.assists ?? 0;
    const points = stat?.points ?? 0;
    const pim = stat?.pim ?? 0;

    if (points >= 20) strengths.push("Хорошая результативность");
    if (assists > goals && goals > 0) strengths.push("Командная игра");
    if (goals >= 10) strengths.push("Умеет завершать атаки");
    if (games >= 15 && pim < 5) strengths.push("Игровая дисциплина");
    if (games > 0 && assists >= 10) strengths.push("Видение льда и передача");

    // Weaknesses
    if (pim >= 20) weaknesses.push("Нужно улучшить игровую дисциплину");
    if (games > 0 && points / games < 0.5)
      weaknesses.push("Нужно повысить эффективность в атаке");
    if (games > 10 && goals === 0 && assists === 0)
      weaknesses.push("Низкая результативность в текущем сезоне");
  }

  // Recommendations
  if (!hasProfile)
    recommendations.push("Заполнить физические данные игрока");
  if (!stat || (stat?.games ?? 0) === 0)
    recommendations.push("Недостаточно статистики для полноценного анализа");

  if (textContainsAny(allNoteText, SKATING_KEYWORDS))
    recommendations.push(
      "Работать над техникой катания и силовым катанием"
    );
  if (textContainsAny(allNoteText, SHOOTING_KEYWORDS))
    recommendations.push(
      "Уделить внимание технике броска и реализации голевых моментов"
    );

  // Deduplicate
  const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

  return {
    strengths: uniq(strengths),
    weaknesses: uniq(weaknesses),
    recommendations: uniq(recommendations),
  };
}

/**
 * AI Development Index — аналитика развития игрока
 */

export interface PlayerForAI {
  skills?: {
    speed: number | null;
    shotAccuracy: number | null;
    dribbling: number | null;
    stamina: number | null;
  } | null;
  coachRatings?: { rating: number }[];
  attendances?: { status: string }[];
  stats?: { goals: number; assists: number; points: number }[];
}

const SKILL_LABELS: Record<string, string> = {
  speed: "Скорость",
  shotAccuracy: "Точность броска",
  dribbling: "Дриблинг",
  stamina: "Выносливость",
};

const SKILL_RECOMMENDATIONS: Record<string, string> = {
  speed: "Увеличить количество скоростных тренировок и спринтов",
  shotAccuracy: "Увеличить тренировки броска и работы с шайбой",
  dribbling: "Добавить упражнения на дриблинг и владение шайбой",
  stamina: "Усилить кардио-нагрузки и выносливость",
};

export interface DevelopmentResult {
  developmentIndex: number;
  skillsAverage: number;
  attendanceScore: number;
  coachRatingScore: number;
  statsScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function calculatePlayerDevelopment(
  player: PlayerForAI
): DevelopmentResult {
  const skillsAverage = calcSkillsAverage(player.skills);
  const attendanceScore = calcAttendanceScore(player.attendances);
  const coachRatingScore = calcCoachRatingScore(player.coachRatings);
  const statsScore = calcStatsScore(player.stats);

  const developmentIndex =
    skillsAverage * 0.4 +
    attendanceScore * 0.2 +
    coachRatingScore * 0.2 +
    statsScore * 0.2;

  const skillValues = getSkillValues(player.skills);
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  for (const [key, value] of Object.entries(skillValues)) {
    const label = SKILL_LABELS[key] ?? key;
    if (value > 85) strengths.push(label);
    if (value < 65) weaknesses.push(label);
    if (value < 70 && SKILL_RECOMMENDATIONS[key]) {
      recommendations.push(SKILL_RECOMMENDATIONS[key]);
    }
  }

  if (attendanceScore < 80 && player.attendances && player.attendances.length > 0) {
    recommendations.push("Улучшить посещаемость тренировок");
  }

  if (coachRatingScore < 60 && (player.coachRatings?.length ?? 0) > 0) {
    recommendations.push("Обратить внимание на рекомендации тренеров");
  }

  const seen = new Set<string>();
  const uniqueRecs = recommendations.filter((r) => {
    if (seen.has(r)) return false;
    seen.add(r);
    return true;
  });

  return {
    developmentIndex: Math.round(developmentIndex * 10) / 10,
    skillsAverage: Math.round(skillsAverage * 10) / 10,
    attendanceScore: Math.round(attendanceScore * 10) / 10,
    coachRatingScore: Math.round(coachRatingScore * 10) / 10,
    statsScore: Math.round(statsScore * 10) / 10,
    strengths,
    weaknesses,
    recommendations: uniqueRecs,
  };
}

function calcSkillsAverage(
  skills: PlayerForAI["skills"]
): number {
  if (!skills) return 0;
  const vals = [
    skills.speed ?? 0,
    skills.shotAccuracy ?? 0,
    skills.dribbling ?? 0,
    skills.stamina ?? 0,
  ].filter((v) => v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function getSkillValues(
  skills: PlayerForAI["skills"]
): Record<string, number> {
  if (!skills) return {};
  return {
    speed: skills.speed ?? 0,
    shotAccuracy: skills.shotAccuracy ?? 0,
    dribbling: skills.dribbling ?? 0,
    stamina: skills.stamina ?? 0,
  };
}

function calcAttendanceScore(attendances?: { status: string }[]): number {
  if (!attendances || attendances.length === 0) return 100;
  const present = attendances.filter((a) => a.status === "PRESENT").length;
  return (present / attendances.length) * 100;
}

function calcCoachRatingScore(ratings?: { rating: number }[]): number {
  if (!ratings || ratings.length === 0) return 100;
  const avg =
    ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
  return ((avg - 1) / 4) * 100;
}

function calcStatsScore(
  stats?: { goals: number; assists: number; points: number }[]
): number {
  if (!stats || stats.length === 0) return 100;
  const totalPoints = stats.reduce(
    (s, st) => s + (st.points ?? (st.goals ?? 0) + (st.assists ?? 0)),
    0
  );
  return Math.min(100, totalPoints * 3);
}

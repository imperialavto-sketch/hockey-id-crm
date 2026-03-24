/**
 * Player Report — rule-based report for parents.
 * Uses Coach Insight data. No AI, no backend.
 */

import type { SessionObservation } from "@/models/sessionObservation";
import { buildCoachInsight, type CoachInsight } from "./coachInsightHelpers";
import { loadCoachInputState } from "./coachInputStorage";
import type { PlayerSkillsMap } from "@/models/playerDevelopment";

export type OverallAssessment = "good" | "stable" | "needs-attention";

export interface PlayerReport {
  period: string;
  overallAssessment: OverallAssessment;
  overallLabel: string;
  overallScore: number | null;
  strengths: string[];
  growthAreas: string[];
  recommendation: string;
  observationCount: number;
}

function getAverageScore(skills: PlayerSkillsMap): number {
  const entries = Object.values(skills);
  if (entries.length === 0) return 0;
  const sum = entries.reduce((a, s) => a + s.score, 0);
  return Math.round(sum / entries.length);
}

function toParentFriendlyStrength(raw: string): string {
  // Преобразуем coach-style в parent-friendly
  if (raw.includes("позитивных наблюдений")) {
    const n = raw.match(/\d+/)?.[0];
    return n ? `Много позитивных моментов на тренировках (${n})` : "Хорошая динамика на тренировках";
  }
  if (raw.includes("Сильная сторона:")) {
    const match = raw.match(/Сильная сторона:\s*(.+?)(?:\s*\(\d+\))?$/);
    return match ? `Силен в ${match[1].toLowerCase()}` : raw;
  }
  if (raw.includes("Рост:")) {
    const match = raw.match(/Рост:\s*(.+)/);
    return match ? `Прогресс по ${match[1].toLowerCase()}` : raw;
  }
  if (raw.includes("Чаще всего оценивалось:")) {
    const match = raw.match(/Чаще всего оценивалось:\s*(.+)/);
    return match ? `Активно работает над ${match[1].toLowerCase()}` : raw;
  }
  if (raw.includes("Регулярные наблюдения")) {
    return "Регулярно посещает тренировки и прогрессирует";
  }
  return raw;
}

function toParentFriendlyGrowth(raw: string): string {
  if (raw.includes("Требует внимания:")) {
    const match = raw.match(/Требует внимания:\s*(.+?)(?:\s*\(\d+\))?$/);
    return match ? `Стоит уделить внимание ${match[1].toLowerCase()}` : raw;
  }
  if (raw.includes("негативных наблюдений")) {
    const n = raw.match(/\d+/)?.[0];
    return n ? `Несколько сложных моментов (${n})` : "Есть над чем поработать";
  }
  if (raw.includes("Спад:")) {
    const match = raw.match(/Спад:\s*(.+)/);
    return match ? `Небольшой спад по ${match[1].toLowerCase()}` : raw;
  }
  if (raw.includes("Спад по нескольким навыкам")) {
    return "Небольшой спад по нескольким направлениям";
  }
  return raw;
}

function toParentFriendlyRecommendation(raw: string): string {
  if (raw.startsWith("Сфокусироваться на")) {
    const match = raw.match(/Сфокусироваться на (.+?)\./);
    return match
      ? `Рекомендуем сосредоточиться на ${match[1].toLowerCase()}. Добавим больше упражнений в тренировки.`
      : raw;
  }
  if (raw.includes("Провести разбор")) {
    const match = raw.match(/Провести разбор по навыкам:\s*(.+)/);
    return match
      ? `Поработаем над ${match[1].toLowerCase()} на ближайших занятиях.`
      : raw;
  }
  if (raw.includes("Продолжать текущую программу")) {
    return "Продолжаем в том же духе. Постепенно добавляем более сложные задачи.";
  }
  if (raw.includes("Запланировать индивидуальную работу")) {
    return "Рекомендуем индивидуальную работу и обсуждение целей с игроком.";
  }
  return raw;
}

/**
 * Build parent-friendly report from Coach Insight and optional player skills.
 */
export function buildPlayerReport(
  insight: CoachInsight,
  playerSkills: PlayerSkillsMap | null,
  observationCount: number
): PlayerReport {
  const overallScore = playerSkills ? getAverageScore(playerSkills) : null;

  let overallAssessment: OverallAssessment = "stable";
  let overallLabel = "Стабильное развитие";

  if (overallScore !== null) {
    if (overallScore > 70) {
      overallAssessment = "good";
      overallLabel = "Хороший прогресс";
    } else if (overallScore < 50) {
      overallAssessment = "needs-attention";
      overallLabel = "Требует внимания";
    } else {
      overallAssessment = "stable";
      overallLabel = "Стабильное развитие";
    }
  }

  const strengths = insight.positives
    .slice(0, 3)
    .map(toParentFriendlyStrength);

  const growthAreas = insight.concerns
    .slice(0, 3)
    .map(toParentFriendlyGrowth);

  const recommendation = toParentFriendlyRecommendation(insight.recommendation);

  return {
    period: "последние тренировки",
    overallAssessment,
    overallLabel,
    overallScore,
    strengths,
    growthAreas,
    recommendation,
    observationCount,
  };
}

/**
 * Load data and build player report. Returns null if < 3 observations.
 */
export async function getPlayerReportForPlayer(
  playerId: string
): Promise<PlayerReport | null> {
  const state = await loadCoachInputState();
  if (!state) return null;

  const allObservations: SessionObservation[] = [];
  for (const session of state.completedSessions) {
    for (const obs of session.observations) {
      if (obs.playerId === playerId) allObservations.push(obs);
    }
  }
  if (state.sessionDraft.observations) {
    for (const obs of state.sessionDraft.observations) {
      if (obs.playerId === playerId) allObservations.push(obs);
    }
  }

  if (allObservations.length < 3) return null;

  const playerSkills = state.playerDevelopmentById[playerId] ?? null;
  const insight = buildCoachInsight(allObservations, playerSkills);
  return buildPlayerReport(insight, playerSkills, allObservations.length);
}

/**
 * Coach Insight — rule-based summary from Session Capture observations and PlayerDevelopment.
 * No AI, no backend. Uses loadCoachInputState data.
 */

import type { SessionObservation } from "@/models/sessionObservation";
import {
  SkillType,
  type PlayerSkill,
  type PlayerSkillsMap,
} from "@/models/playerDevelopment";
import { loadCoachInputState } from "@/lib/coachInputStorage";
import { countImpacts, computeMostObservedSkill } from "@/lib/sessionReviewHelpers";

const SKILL_LABELS: Record<SkillType, string> = {
  [SkillType.skating]: "Катание",
  [SkillType.shooting]: "Броски",
  [SkillType.passing]: "Передачи",
  [SkillType.positioning]: "Позиционирование",
  [SkillType.defense]: "Защита",
  [SkillType.effort]: "Усилие",
  [SkillType.confidence]: "Уверенность",
  [SkillType.communication]: "Коммуникация",
};

export interface CoachInsight {
  summary: string;
  positives: string[];
  concerns: string[];
  recommendation: string;
}

function getTopSkillByScore(skills: PlayerSkillsMap): { skill: SkillType; data: PlayerSkill } | null {
  let top: { skill: SkillType; data: PlayerSkill } | null = null;
  for (const st of Object.keys(skills) as SkillType[]) {
    const data = skills[st]!;
    if (!top || data.score > top.data.score) {
      top = { skill: st, data };
    }
  }
  return top;
}

function getWeakestSkillByScore(skills: PlayerSkillsMap): { skill: SkillType; data: PlayerSkill } | null {
  let weak: { skill: SkillType; data: PlayerSkill } | null = null;
  for (const st of Object.keys(skills) as SkillType[]) {
    const data = skills[st]!;
    if (!weak || data.score < weak.data.score) {
      weak = { skill: st, data };
    }
  }
  return weak;
}

function getSkillsWithTrend(
  skills: PlayerSkillsMap,
  trend: "up" | "down" | "stable"
): { skill: SkillType; data: PlayerSkill }[] {
  return (Object.keys(skills) as SkillType[])
    .filter((st) => skills[st]!.trend === trend)
    .map((st) => ({ skill: st, data: skills[st]! }));
}

/**
 * Build rule-based Coach Insight from observations and player development.
 */
export function buildCoachInsight(
  observations: SessionObservation[],
  playerSkills: PlayerSkillsMap | null,
  skillLabels: Record<SkillType, string> = SKILL_LABELS
): CoachInsight {
  const positives: string[] = [];
  const concerns: string[] = [];
  let summary = "";

  const counts = countImpacts(observations);
  const mostObservedSkill = computeMostObservedSkill(observations);
  const topSkill = playerSkills ? getTopSkillByScore(playerSkills) : null;
  const weakSkill = playerSkills ? getWeakestSkillByScore(playerSkills) : null;
  const upSkills = playerSkills ? getSkillsWithTrend(playerSkills, "up") : [];
  const downSkills = playerSkills ? getSkillsWithTrend(playerSkills, "down") : [];

  // Summary
  if (counts.positive > counts.negative && counts.positive > counts.neutral) {
    summary = "Игрок прогрессирует. Большинство наблюдений позитивные.";
  } else if (counts.negative > counts.positive) {
    summary = "Наблюдается спад. Требует внимания.";
  } else if (upSkills.length > 0) {
    summary = "Положительная динамика по ключевым навыкам.";
  } else if (downSkills.length > 0) {
    summary = "Снижение по некоторым навыкам.";
  } else {
    summary = "Стабильные показатели. Есть потенциал для роста.";
  }

  // Positives
  if (topSkill && topSkill.data.score >= 70) {
    positives.push(`Сильная сторона: ${skillLabels[topSkill.skill]} (${topSkill.data.score})`);
  }
  if (counts.positive > 0) {
    positives.push(`${counts.positive} позитивных наблюдений`);
  }
  if (upSkills.length > 0 && upSkills.length <= 3) {
    const names = upSkills.map((s) => skillLabels[s.skill]).join(", ");
    positives.push(`Рост: ${names}`);
  } else if (upSkills.length > 3) {
    positives.push(`Рост по нескольким навыкам`);
  }
  if (mostObservedSkill && !positives.some((p) => p.includes(skillLabels[mostObservedSkill]))) {
    positives.push(`Чаще всего оценивалось: ${skillLabels[mostObservedSkill]}`);
  }
  if (positives.length === 0) {
    positives.push("Регулярные наблюдения помогают отслеживать прогресс");
  }

  // Concerns
  if (weakSkill && weakSkill.data.score < 50) {
    concerns.push(`Требует внимания: ${skillLabels[weakSkill.skill]} (${weakSkill.data.score})`);
  }
  if (counts.negative > 0) {
    concerns.push(`${counts.negative} негативных наблюдений`);
  }
  if (downSkills.length > 0 && downSkills.length <= 2) {
    const names = downSkills.map((s) => skillLabels[s.skill]).join(", ");
    concerns.push(`Спад: ${names}`);
  } else if (downSkills.length > 2) {
    concerns.push("Спад по нескольким навыкам");
  }

  // Recommendation
  let recommendation = "";
  if (weakSkill && weakSkill.data.score < 50) {
    recommendation = `Сфокусироваться на ${skillLabels[weakSkill.skill]}. Добавлять упражнения в тренировки.`;
  } else if (downSkills.length > 0) {
    const names = downSkills.map((s) => skillLabels[s.skill]).join(", ");
    recommendation = `Провести разбор по навыкам: ${names}.`;
  } else if (counts.positive >= counts.negative) {
    recommendation = "Продолжать текущую программу. Добавить более сложные задачи.";
  } else {
    recommendation = "Запланировать индивидуальную работу. Обсудить с игроком цели.";
  }

  return {
    summary,
    positives: positives.slice(0, 3),
    concerns: concerns.slice(0, 2),
    recommendation,
  };
}

/**
 * Load observations and player development for a player, then build insight.
 * Returns null if < 3 observations.
 */
export async function getCoachInsightForPlayer(
  playerId: string
): Promise<{ insight: CoachInsight; observationCount: number } | null> {
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

  return { insight, observationCount: allObservations.length };
}

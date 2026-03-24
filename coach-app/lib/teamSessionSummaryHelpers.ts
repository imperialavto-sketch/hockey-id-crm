/**
 * Team Session Summary — rule-based summary for a single training session.
 * Uses last completed session only. No backend.
 */

import type { CompletedTrainingSession } from "@/models/sessionObservation";
import type { SkillType } from "@/models/playerDevelopment";
import { loadCoachInputState } from "./coachInputStorage";
import {
  groupObservationsByPlayer,
  countImpacts,
  type ImpactCounts,
} from "./sessionReviewHelpers";
import { getLastCompletedSession } from "./sessionReviewCenterHelpers";

const SKILL_LABELS: Record<SkillType, string> = {
  skating: "Катание",
  shooting: "Броски",
  passing: "Передачи",
  positioning: "Позиционирование",
  defense: "Защита",
  effort: "Усилие",
  confidence: "Уверенность",
  communication: "Коммуникация",
};

export interface TeamSessionSummary {
  session: CompletedTrainingSession | null;
  uniquePlayers: number;
  observationCount: number;
  topSkills: { skill: SkillType; label: string; count: number }[];
  summaryHeadline: string;
  strengthsLine: string;
  attentionLine: string;
  recommendationLine: string;
  copyText: string;
  hasData: boolean;
}

function getTopObservedSkills(
  observations: CompletedTrainingSession["observations"],
  limit: number = 3
): { skill: SkillType; label: string; count: number }[] {
  if (observations.length === 0) return [];
  const bySkill = new Map<SkillType, number>();
  for (const obs of observations) {
    bySkill.set(obs.skillType, (bySkill.get(obs.skillType) ?? 0) + 1);
  }
  const sorted = Array.from(bySkill.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  return sorted.map(([skill, count]) => ({
    skill,
    label: SKILL_LABELS[skill] ?? skill,
    count,
  }));
}

function buildSummaryHeadline(
  counts: ImpactCounts,
  uniquePlayers: number,
  observationCount: number
): string {
  if (counts.positive > counts.negative && counts.positive > 0) {
    return "Тренировка прошла продуктивно. Хорошая вовлечённость группы.";
  }
  if (counts.negative > counts.positive) {
    return "Есть моменты, требующие внимания на следующих занятиях.";
  }
  if (observationCount >= 5 && uniquePlayers >= 2) {
    return "Достаточно наблюдений для оценки прогресса группы.";
  }
  return "Тренировка завершена. Наблюдения сохранены.";
}

function buildStrengthsLine(counts: ImpactCounts, topSkills: { label: string }[]): string {
  if (counts.positive > 0 && topSkills.length > 0) {
    const skillNames = topSkills.map((s) => s.label).join(", ");
    return `Позитивные сигналы по ${skillNames.toLowerCase()}.`;
  }
  if (counts.positive > counts.negative) {
    return "Большинство наблюдений позитивные.";
  }
  if (counts.positive > 0) {
    return `Позитивных наблюдений: ${counts.positive}.`;
  }
  return "Пока мало данных.";
}

function buildAttentionLine(counts: ImpactCounts, topSkills: { label: string }[]): string {
  if (counts.negative > 0 && topSkills.length > 0) {
    return `Обратить внимание на ${topSkills[0]!.label.toLowerCase()} и связанные моменты.`;
  }
  if (counts.negative > counts.positive) {
    return "Есть негативные сигналы — стоит обсудить с группой.";
  }
  if (counts.neutral > counts.positive) {
    return "Много нейтральных оценок — можно усилить обратную связь.";
  }
  return "Критичных зон не выявлено.";
}

function buildRecommendationLine(
  counts: ImpactCounts,
  topSkills: { label: string }[]
): string {
  if (topSkills.length > 0) {
    const focus = topSkills.map((s) => s.label.toLowerCase()).join(", ");
    return `На следующей тренировке: фокус на ${focus}.`;
  }
  if (counts.positive < counts.negative) {
    return "Провести разбор ключевых моментов с игроками.";
  }
  return "Продолжать текущую программу.";
}

function buildCopyText(summary: TeamSessionSummary): string {
  if (!summary.hasData) return "";

  const lines: string[] = [];
  lines.push("Краткая сводка по тренировке");
  lines.push("");
  const pl = summary.uniquePlayers === 1 ? "игрок" : summary.uniquePlayers < 5 ? "игрока" : "игроков";
  const obsPl = summary.observationCount === 1 ? "наблюдение" : summary.observationCount < 5 ? "наблюдения" : "наблюдений";
  lines.push(
    `Участвовало: ${summary.uniquePlayers} ${pl}, наблюдений: ${summary.observationCount} ${obsPl}.`
  );
  if (summary.topSkills.length > 0) {
    const skillsStr = summary.topSkills.map((s) => s.label).join(", ");
    lines.push(`Наиболее отмечаемые навыки: ${skillsStr}.`);
  }
  lines.push("");
  lines.push(`Что получилось: ${summary.strengthsLine}`);
  lines.push(`На что обратить внимание: ${summary.attentionLine}`);
  lines.push(`Рекомендация: ${summary.recommendationLine}`);

  return lines.join("\n");
}

/**
 * Build team session summary from last completed session.
 */
export function buildTeamSessionSummary(
  session: CompletedTrainingSession | null
): TeamSessionSummary {
  if (!session || session.observations.length === 0) {
    return {
      session: null,
      uniquePlayers: 0,
      observationCount: 0,
      topSkills: [],
      summaryHeadline: "",
      strengthsLine: "",
      attentionLine: "",
      recommendationLine: "",
      copyText: "",
      hasData: false,
    };
  }

  const observations = session.observations;
  const grouped = groupObservationsByPlayer(observations);
  const uniquePlayers = grouped.length;
  const observationCount = observations.length;
  const counts = countImpacts(observations);
  const topSkills = getTopObservedSkills(observations, 3);

  const summaryHeadline = buildSummaryHeadline(counts, uniquePlayers, observationCount);
  const strengthsLine = buildStrengthsLine(counts, topSkills);
  const attentionLine = buildAttentionLine(counts, topSkills);
  const recommendationLine = buildRecommendationLine(counts, topSkills);

  const partial: TeamSessionSummary = {
    session,
    uniquePlayers,
    observationCount,
    topSkills,
    summaryHeadline,
    strengthsLine,
    attentionLine,
    recommendationLine,
    copyText: "",
    hasData: true,
  };

  partial.copyText = buildCopyText(partial);
  return partial;
}

/**
 * Load state and build team session summary for last completed session.
 */
export async function loadTeamSessionSummary(): Promise<TeamSessionSummary> {
  const state = await loadCoachInputState();
  const session = getLastCompletedSession(state);
  return buildTeamSessionSummary(session);
}

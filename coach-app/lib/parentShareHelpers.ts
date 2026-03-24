/**
 * Parent Share — rule-based message for parent from player report.
 * No AI, no backend. Uses PlayerReport data.
 */

import type { PlayerReport } from "./playerReportHelpers";

/**
 * Build a friendly parent-facing message from the player report.
 * Structure: greeting → progress → strengths → growth → recommendation → closing
 */
export function buildParentShareMessage(
  report: PlayerReport,
  playerName: string
): string {
  const parts: string[] = [];

  parts.push("Здравствуйте!");

  const progressLine = getProgressLine(report, playerName);
  parts.push(progressLine);

  const strengths = report.strengths.slice(0, 2);
  if (strengths.length > 0) {
    parts.push("Сильные стороны: " + strengths.join(". "));
  }

  const growth = report.growthAreas[0];
  if (growth) {
    parts.push("Зона роста: " + growth);
  }

  parts.push("Рекомендация: " + report.recommendation);

  parts.push("Всего хорошего!");

  return parts.join("\n\n");
}

function getProgressLine(report: PlayerReport, playerName: string): string {
  switch (report.overallAssessment) {
    case "good":
      return `Хочу поделиться кратким отчётом по ${playerName}. На последних тренировках хороший прогресс.`;
    case "needs-attention":
      return `Хочу поделиться отчётом по ${playerName}. Есть моменты, на которые стоит обратить внимание.`;
    default:
      return `Хочу поделиться кратким отчётом по ${playerName}. Стабильное развитие за последние тренировки.`;
  }
}

/**
 * Собирает компактный knowledge context для Coach Mark.
 * Используй в system prompt — не перегружай, только ключевое.
 */

import {
  skillAreas,
  ageDevelopment,
  parentSupportPatterns,
  recommendationRules,
} from "./coachMarkKnowledge";

/**
 * Формирует компактную строку знаний для вставки в system prompt.
 * Ограничивает размер, чтобы не перегружать контекст.
 */
export function buildCoachMarkContext(): string {
  const parts: string[] = [];

  // Skill areas — компактно
  parts.push("## НАВЫКИ");
  for (const s of skillAreas) {
    parts.push(
      `${s.key}: ${s.description} Drills: ${s.drills.slice(0, 2).join(", ")}.`
    );
  }

  // Age development
  parts.push("\n## ВОЗРАСТ");
  for (const a of ageDevelopment) {
    parts.push(
      `${a.ageRange}: ${a.priority.join(", ")}. Избегать: ${a.avoid.join(", ")}.`
    );
  }

  // Parent support
  parts.push("\n## ВОПРОСЫ РОДИТЕЛЕЙ");
  for (const p of parentSupportPatterns) {
    parts.push(`"${p.question}" → ${p.conclusion} ${p.action}`);
  }

  // Recommendation rules
  parts.push("\n## ПРАВИЛА");
  for (const r of recommendationRules) {
    parts.push(`${r.condition} → ${r.recommendation}`);
  }

  return parts.join("\n");
}

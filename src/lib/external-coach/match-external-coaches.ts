/**
 * STEP 18: подбор внешних тренеров по триггеру extra_training (reason → темы → skills в БД).
 */

import { prisma } from "@/lib/prisma";
import type { SessionMeaningActionTrigger } from "@/lib/live-training/session-meaning";

const MAX_MATCHES = 3;

/** Соответствие паттернов в тексте reason каноническим skill-тегам (как в seed ExternalCoach.skills). */
const REASON_SKILL_PATTERNS: Array<{ skill: string; re: RegExp }> = [
  { skill: "skating", re: /катани|катание|skating|stride|коньк/i },
  { skill: "shooting", re: /броск|броска|shooting|shot|щелчок/i },
  { skill: "puck_handling", re: /шайб|владени|stickhandl|puck|рук/i },
  { skill: "defense", re: /защит|defense|defensive|отбор|корпус/i },
  { skill: "conditioning", re: /офп|силов|вынослив|conditioning|физ/i },
  { skill: "goaltending", re: /вратар|goalie|goaltending|ловушк/i },
  { skill: "power_play", re: /большинств|power[\s_-]?play|pp\b/i },
  { skill: "faceoffs", re: /вбрасыван|face[\s_-]?off/i },
  /** Типичные формулировки extra_training из session-meaning-action-triggers (RU). */
  { skill: "puck_handling", re: /повтор|сдвига|прошлой|фокус|отметк|наблюден/i },
];

export type MatchedExternalCoach = {
  id: string;
  name: string;
  skills: string[];
};

/**
 * Извлекает канонические skill-теги из текста reason (рус/англ).
 */
export function extractSkillTagsFromTriggerReason(reason: string): string[] {
  const text = reason.trim();
  if (!text) return [];
  const found = new Set<string>();
  for (const { skill, re } of REASON_SKILL_PATTERNS) {
    if (re.test(text)) found.add(skill);
  }
  return [...found];
}

/**
 * Подбор до 3 активных ExternalCoach, у которых `skills` пересекается с извлечёнными темами.
 * Для типов триггера кроме `extra_training` всегда пустой массив.
 */
export async function matchExternalCoaches(
  trigger: SessionMeaningActionTrigger
): Promise<MatchedExternalCoach[]> {
  if (trigger.type !== "extra_training") return [];

  const tags = extractSkillTagsFromTriggerReason(trigger.reason);
  if (tags.length === 0) return [];

  const coaches = await prisma.externalCoach.findMany({
    where: { isActive: true },
    select: { id: true, name: true, skills: true },
    take: 80,
  });

  const scored = coaches
    .map((c) => ({
      coach: c,
      score: tags.filter((t) => c.skills.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.coach.name.localeCompare(b.coach.name, "ru"));

  const out: MatchedExternalCoach[] = [];
  const seen = new Set<string>();
  for (const { coach: c } of scored) {
    if (seen.has(c.id) || out.length >= MAX_MATCHES) break;
    seen.add(c.id);
    out.push({ id: c.id, name: c.name, skills: [...c.skills] });
  }
  return out;
}

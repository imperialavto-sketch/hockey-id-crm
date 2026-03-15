import type { MockCoach } from "@/constants/mockCoaches";

import { DEMO_PLAYER } from "@/constants/demoPlayer";

/** Default player context for Голыш Марк (from AI report) */
export const MOCK_PLAYER_CONTEXT = {
  weakSkills: ["Бросок", "Силовая борьба", "Игра у борта"],
  strongSkills: ["Катание", "Скорость", "Игровое мышление"],
  age: DEMO_PLAYER.age,
  position: DEMO_PLAYER.positionRu,
  targetGoal: "Развитие зон роста из AI отчёта",
} as const;

/** Mutable copy for matchCoachesToPlayer */
export function getDefaultPlayerContext(): PlayerContext {
  return {
    weakSkills: [...MOCK_PLAYER_CONTEXT.weakSkills],
    strongSkills: MOCK_PLAYER_CONTEXT.strongSkills ? [...MOCK_PLAYER_CONTEXT.strongSkills] : undefined,
    age: MOCK_PLAYER_CONTEXT.age,
    position: MOCK_PLAYER_CONTEXT.position,
    targetGoal: MOCK_PLAYER_CONTEXT.targetGoal,
  };
}

export interface PlayerContext {
  weakSkills: string[];
  strongSkills?: string[];
  age: number;
  position?: string;
  targetGoal?: string;
}

export interface MatchResult {
  coach: MockCoach;
  matchScore: number;
  matchReasons: string[];
  recommendedFor: string[];
}

const WEAK_TO_SPEC: Record<string, string[]> = {
  "бросок": ["Бросок"],
  "катание": ["Катание"],
  "силовая борьба": ["Силовая подготовка"],
  "физика": ["Силовая подготовка"],
  "игра у борта": ["Stickhandling", "Игровое мышление"],
  "stickhandling": ["Stickhandling"],
  "игровое мышление": ["Игровое мышление"],
  "подкатка": ["Подкатка"],
};

function weakSkillMatchesCoach(weak: string, coachSpecs: string[]): boolean {
  const w = weak.toLowerCase();
  const specs = WEAK_TO_SPEC[w];
  if (!specs) return false;
  return specs.some((s) =>
    coachSpecs.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
  );
}

function parseAgeGroups(groups: string[] | undefined): { min: number; max: number }[] {
  if (!groups?.length) return [];
  return groups.map((g) => {
    const [a, b] = g.split("-").map(Number);
    return { min: a ?? 0, max: b ?? 99 };
  });
}

function ageInRange(age: number, groups: { min: number; max: number }[]): boolean {
  return groups.some((r) => age >= r.min && age <= r.max);
}

export function matchCoachesToPlayer(
  coaches: MockCoach[],
  ctx: PlayerContext,
  options?: { returnAll?: boolean }
): MatchResult[] {
  const weak = ctx.weakSkills.map((s) => s.toLowerCase());
  const results: MatchResult[] = [];

  for (const coach of coaches) {
    let score = 50;
    const reasons: string[] = [];
    const recommendedFor: string[] = [];

    const coachSpecs = [
      coach.specialization,
      ...(coach.specializations ?? []),
    ].filter(Boolean);
    const uniqueSpecs = [...new Set(coachSpecs)];

    for (const weakSkill of ctx.weakSkills) {
      const w = weakSkill.toLowerCase();
      if (weakSkillMatchesCoach(w, uniqueSpecs)) {
        score += 15;
        reasons.push(`Подходит для улучшения ${weakSkill.toLowerCase()}`);
        recommendedFor.push(weakSkill);
      }
    }

    const ageGroups = parseAgeGroups(coach.ageGroups);
    if (ageGroups.length && ageInRange(ctx.age, ageGroups)) {
      score += 10;
      reasons.push(`Работает с возрастом ${ctx.age} лет`);
    }

    if (coach.verified) {
      score += 5;
      reasons.push("Проверенный тренер");
    }

    if ((coach.repeatBookingRate ?? 0) >= 70) {
      score += 5;
      reasons.push("Высокий процент повторных записей");
    }

    if ((coach.rating ?? 0) >= 4.8) {
      score += 5;
    }

    if ((coach.sessionsCompleted ?? 0) >= 200) {
      score += 3;
      if (!reasons.some((r) => r.includes("опыт"))) {
        reasons.push("Большой опыт проведения тренировок");
      }
    }

    if (recommendedFor.length === 0 && score > 60) {
      recommendedFor.push("Индивидуальная работа");
    }
    if (score > 75) {
      recommendedFor.push("Быстрый прогресс");
    }

    results.push({
      coach,
      matchScore: Math.min(100, Math.round(score)),
      matchReasons: [...new Set(reasons)],
      recommendedFor: [...new Set(recommendedFor)],
    });
  }

  const sorted = results.sort((a, b) => b.matchScore - a.matchScore);
  return options?.returnAll ? sorted : sorted.filter((r) => r.matchScore >= 60);
}

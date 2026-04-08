/**
 * ❗ NOT CORE SCHOOL SSOT — parent external training contour (PHASE 6).
 * ⚠ AI-ASSISTED, NOT AUTONOMOUS AGENT: gap из сигналов игрока — эвристики; coach/slot — ⚠ MOCK MATCHING (MVP).
 */

import { computeDevelopmentGapFromPlayerSignals } from "@/lib/arena/compute-development-gap-from-player-signals";

export type ExternalTrainingAgentGap = {
  skillKey: string;
  severity: number;
  confidence: number;
  recommendationType: string;
};

export type ExternalTrainingAgentCoach = {
  id: string;
  name: string;
  skills: string[];
  rating: number;
  nextAvailableSlots: Array<{ date: string; location: string }>;
};

export type ExternalTrainingAgentResult = {
  gap: {
    skillKey: string;
    severity: number;
    reasonSummary: string;
    isFallback: boolean;
  };
  coach: {
    id: string;
    name: string;
  };
  slot: {
    date: string;
    location: string;
  };
};

/**
 * FALLBACK-ONLY MVP PATH: used when `computeDevelopmentGapFromPlayerSignals` returns null
 * (no qualifying real signal). Same shape as legacy mock for coach/slot matching.
 */
const mockGaps: ExternalTrainingAgentGap[] = [
  {
    skillKey: "skating.firstStep",
    severity: 0.8,
    confidence: 0.9,
    recommendationType: "external",
  },
];

const FALLBACK_ARENA_REASON =
  "Рекомендация контура (fallback/MVP): усилить первый шаг и устойчивость в движении — не автономная диагностика.";

const mockCoaches: ExternalTrainingAgentCoach[] = [
  {
    id: "coach1",
    name: "Иван Петров",
    skills: [
      "skating.firstStep",
      "balance",
      "stickhandling.control",
      "passing.vision",
      "shooting.accuracy",
      "hockeyiq.positioning",
      "oneOnOne.battle",
    ],
    rating: 4.8,
    nextAvailableSlots: [
      {
        date: "2026-04-05T18:00:00Z",
        location: "Ice Arena A",
      },
      {
        date: "2026-04-06T17:00:00Z",
        location: "Ice Arena B",
      },
    ],
  },
];

type WorkingGap = {
  skillKey: string;
  severity: number;
  confidence: number;
  recommendationType: string;
  reasonSummary: string;
};

function pickCriticalMockGap(gaps: ExternalTrainingAgentGap[]): ExternalTrainingAgentGap {
  return [...gaps].sort((a, b) => b.severity - a.severity)[0]!;
}

function findCoachForSkill(
  coaches: ExternalTrainingAgentCoach[],
  skillKey: string
): ExternalTrainingAgentCoach | null {
  const withSkill = coaches.filter((c) => c.skills.includes(skillKey));
  if (withSkill.length === 0) return null;
  return [...withSkill].sort((a, b) => b.rating - a.rating)[0]!;
}

export type RunExternalTrainingAgentOptions = {
  /** When true, prefer second slot if present (UX: "Другой вариант"). */
  alternateSlot?: boolean;
};

/**
 * 1) Real gap from DB/evaluation signals when rules fire.
 * 2) Else fallback mock gap (explicit `isFallback: true` in response).
 */
export async function runExternalTrainingAgent(
  playerId: string,
  options?: RunExternalTrainingAgentOptions
): Promise<ExternalTrainingAgentResult | null> {
  const computed = await computeDevelopmentGapFromPlayerSignals(playerId);

  let isFallback = false;
  let working: WorkingGap;

  if (computed && computed.recommendationType === "external") {
    working = {
      skillKey: computed.skillKey,
      severity: computed.severity,
      confidence: computed.confidence,
      recommendationType: "external",
      reasonSummary: computed.reasonSummary,
    };
  } else {
    /** FALLBACK-ONLY MVP PATH — no structured signal passed the bar; demo gap. */
    isFallback = true;
    const m = pickCriticalMockGap(mockGaps);
    working = {
      skillKey: m.skillKey,
      severity: m.severity,
      confidence: m.confidence,
      recommendationType: m.recommendationType,
      reasonSummary: FALLBACK_ARENA_REASON,
    };
  }

  const coach = findCoachForSkill(mockCoaches, working.skillKey);
  if (!coach || coach.nextAvailableSlots.length === 0) {
    return null;
  }

  const slots = coach.nextAvailableSlots;
  const slot =
    options?.alternateSlot && slots[1] != null ? slots[1]! : slots[0]!;

  return {
    gap: {
      skillKey: working.skillKey,
      severity: working.severity,
      reasonSummary: working.reasonSummary,
      isFallback,
    },
    coach: {
      id: coach.id,
      name: coach.name,
    },
    slot: {
      date: slot.date,
      location: slot.location,
    },
  };
}

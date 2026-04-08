/**
 * Deterministic development gap from existing Hockey ID signals (no LLM).
 * Reads SkillProgress, BehaviorLog, quick evaluations — same family as professional-stats / parent APIs.
 */

import type { SkillType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getParentEvaluationSummary,
  getParentLatestSessionEvaluation,
} from "@/lib/parent-players";

export type ComputedDevelopmentGap = {
  skillKey: string;
  severity: number;
  confidence: number;
  recommendationType: "none" | "external";
  reasonSummary: string;
};

type GapCandidate = Omit<ComputedDevelopmentGap, "recommendationType"> & {
  recommendationType: "external";
};

/** Maps SkillType → agent skillKey (must intersect mock coach skills). */
const SKILL_TYPE_TO_KEY: Record<SkillType, string> = {
  SKATING: "skating.firstStep",
  BALANCE: "balance",
  STICKHANDLING: "stickhandling.control",
  PASSING: "passing.vision",
  SHOOTING: "shooting.accuracy",
  GAME_WITHOUT_PUCK: "hockeyiq.positioning",
  ONE_ON_ONE: "oneOnOne.battle",
};

const SKILL_LABEL_RU: Record<SkillType, string> = {
  SKATING: "катание и первый шаг",
  BALANCE: "баланс и устойчивость",
  STICKHANDLING: "владение клюшкой",
  PASSING: "передачи",
  SHOOTING: "бросок",
  GAME_WITHOUT_PUCK: "игра без шайбы",
  ONE_ON_ONE: "силовые и единоборства",
};

const MIN_SEVERITY = 0.52;
const MAX_CONFIDENCE = 0.92;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function mergeBySkillKey(candidates: GapCandidate[]): GapCandidate[] {
  const m = new Map<string, GapCandidate>();
  for (const c of candidates) {
    const prev = m.get(c.skillKey);
    if (
      !prev ||
      c.severity > prev.severity ||
      (c.severity === prev.severity && c.confidence > prev.confidence)
    ) {
      m.set(c.skillKey, c);
    }
  }
  return [...m.values()];
}

function pickBest(candidates: GapCandidate[]): GapCandidate | null {
  const merged = mergeBySkillKey(candidates);
  if (merged.length === 0) return null;
  merged.sort((a, b) =>
    b.severity !== a.severity
      ? b.severity - a.severity
      : b.confidence - a.confidence
  );
  const top = merged[0]!;
  return top.severity >= MIN_SEVERITY ? top : null;
}

type LatestSkillRow = { skill: SkillType; status: string; trend: string };

async function loadLatestSkillRows(playerId: string): Promise<LatestSkillRow[]> {
  const rows = await prisma.skillProgress.findMany({
    where: { playerId },
    orderBy: { measuredAt: "desc" },
    take: 48,
    select: {
      skill: true,
      status: true,
      trend: true,
      measuredAt: true,
    },
  });
  const bySkill = new Map<SkillType, LatestSkillRow>();
  for (const r of rows) {
    if (!bySkill.has(r.skill)) {
      bySkill.set(r.skill, {
        skill: r.skill,
        status: r.status,
        trend: r.trend,
      });
    }
  }
  return [...bySkill.values()];
}

function skillProgressCandidates(rows: LatestSkillRow[]): GapCandidate[] {
  const out: GapCandidate[] = [];
  for (const r of rows) {
    const label = SKILL_LABEL_RU[r.skill];
    const skillKey = SKILL_TYPE_TO_KEY[r.skill];

    if (r.status === "WEAK") {
      out.push({
        skillKey,
        severity: 0.78,
        confidence: clamp01(0.68 + 0.04),
        recommendationType: "external",
        reasonSummary: `По данным Hockey ID навык «${label}» отмечен как зона роста — сейчас уместно усилить его с внешним тренером.`,
      });
    } else if (r.status === "DEVELOPING" && r.trend === "DOWN") {
      out.push({
        skillKey,
        severity: 0.64,
        confidence: 0.58,
        recommendationType: "external",
        reasonSummary: `Арена видит спад по «${label}»; персональная работа поможет стабилизировать прогресс.`,
      });
    }
  }
  return out;
}

async function evaluationCandidates(playerId: string): Promise<GapCandidate[]> {
  const out: GapCandidate[] = [];
  const summary = await getParentEvaluationSummary(playerId, 90);
  const n = summary.totalEvaluations;
  const confBoost = clamp01(0.5 + Math.min(n, 10) * 0.035);

  if (n >= 2) {
    if (summary.avgFocus != null && summary.avgFocus <= 2.5) {
      const depth = (2.5 - summary.avgFocus) / 2.5;
      out.push({
        skillKey: "skating.firstStep",
        severity: clamp01(0.55 + depth * 0.18),
        confidence: clamp01(confBoost),
        recommendationType: "external",
        reasonSummary:
          "По оценкам на тренировках внимание и концентрация на льду ниже комфортного уровня — полезно усилить первый шаг и работу ног.",
      });
    }
    if (summary.avgDiscipline != null && summary.avgDiscipline <= 2.5) {
      const depth = (2.5 - summary.avgDiscipline) / 2.5;
      out.push({
        skillKey: "balance",
        severity: clamp01(0.54 + depth * 0.16),
        confidence: clamp01(confBoost - 0.04),
        recommendationType: "external",
        reasonSummary:
          "Средние отметки по дисциплине на сменах проседают; внешняя тренировка поможет выровнять опору и самоорганизацию в движении.",
      });
    }
    if (summary.avgEffort != null && summary.avgEffort <= 2.5) {
      const depth = (2.5 - summary.avgEffort) / 2.5;
      out.push({
        skillKey: "balance",
        severity: clamp01(0.53 + depth * 0.15),
        confidence: clamp01(confBoost - 0.06),
        recommendationType: "external",
        reasonSummary:
          "По усилиям на льду есть запас: персональная работа по базе и балансу обычно быстро поднимает вовлечённость.",
      });
    }
  }

  const latest = await getParentLatestSessionEvaluation(playerId);
  if (latest && n < 2) {
    if (latest.focus != null && latest.focus <= 2) {
      out.push({
        skillKey: "skating.firstStep",
        severity: 0.56,
        confidence: 0.48,
        recommendationType: "external",
        reasonSummary:
          "Последняя тренировка показала низкую концентрацию — Арена рекомендует точечно поработать над первым шагом и чтением ситуации.",
      });
    }
    if (latest.discipline != null && latest.discipline <= 2) {
      out.push({
        skillKey: "balance",
        severity: 0.54,
        confidence: 0.46,
        recommendationType: "external",
        reasonSummary:
          "На последней смене дисциплина была ниже обычного; устойчивость и баланс в движении — хороший фокус для внешней сессии.",
      });
    }
    if (latest.effort != null && latest.effort <= 2) {
      out.push({
        skillKey: "balance",
        severity: 0.53,
        confidence: 0.45,
        recommendationType: "external",
        reasonSummary:
          "Недавняя оценка усилий занижена; короткая работа с тренером по базе часто перезапускает темп игры.",
      });
    }
  }

  return out;
}

async function behaviorCandidates(playerId: string): Promise<GapCandidate[]> {
  const logs = await prisma.behaviorLog.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: 14,
    select: { type: true },
  });
  const passive = logs.filter(
    (l) => l.type === "LOW_ENGAGEMENT" || l.type === "PASSIVE_PLAY"
  ).length;
  if (passive >= 3) {
    return [
      {
        skillKey: "balance",
        severity: 0.56,
        confidence: 0.52,
        recommendationType: "external",
        reasonSummary:
          "В недавних наблюдениях чаще встречаются спокойная игра и низкая вовлечённость — Арена предлагает усилить базу и баланс с тренером.",
      },
    ];
  }
  return [];
}

/**
 * Returns one external-training gap when deterministic rules find a clear signal; otherwise null.
 */
export async function computeDevelopmentGapFromPlayerSignals(
  playerId: string
): Promise<ComputedDevelopmentGap | null> {
  const id = playerId?.trim();
  if (!id) return null;

  try {
    const [skillRows, evalC, behC] = await Promise.all([
      loadLatestSkillRows(id),
      evaluationCandidates(id),
      behaviorCandidates(id),
    ]);

    const skillC = skillProgressCandidates(skillRows);
    const all = [...skillC, ...evalC, ...behC];
    const best = pickBest(all);
    if (!best) return null;

    return {
      ...best,
      confidence: clamp01(Math.min(MAX_CONFIDENCE, best.confidence)),
      recommendationType: "external",
    };
  } catch (e) {
    console.error(
      "[computeDevelopmentGapFromPlayerSignals]",
      id,
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

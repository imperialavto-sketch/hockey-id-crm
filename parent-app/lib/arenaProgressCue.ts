/**
 * Спокойный позитивный / progress cue для Арены.
 * Только playerContext, без LLM и без новых запросов. Без показа, если оснований нет.
 */

import type { ArenaParentPlayerContext } from "@/types/arenaParentPlayerContext";

export type ArenaProgressCueTone = "normal" | "lowData" | "subtlePositive";

export type ArenaProgressCue = {
  label: string;
  text: string;
  toneVariant: ArenaProgressCueTone;
  isVisible: boolean;
};

const clip = (value: string, maxLen: number): string => {
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
};

function minEvaluation(ctx: ArenaParentPlayerContext): number | null {
  const e = ctx.latestSessionEvaluation;
  if (!e) return null;
  const nums = [e.effort, e.focus, e.discipline].filter(
    (x): x is number => typeof x === "number"
  );
  return nums.length ? Math.min(...nums) : null;
}

function countEvaluationScores(ctx: ArenaParentPlayerContext): number {
  const e = ctx.latestSessionEvaluation;
  if (!e) return 0;
  return [e.effort, e.focus, e.discipline].filter((x) => typeof x === "number").length;
}

/** Сильный «минус» по последней оценке — позитивный слой не показываем. */
function isBlockedByEvaluation(ctx: ArenaParentPlayerContext): boolean {
  const m = minEvaluation(ctx);
  return m !== null && m <= 2;
}

function hasSolidAttendance(ctx: ArenaParentPlayerContext): boolean {
  const a = ctx.attendanceSummary;
  if (!a || a.totalSessions == null || a.totalSessions < 4) return false;
  return typeof a.attendanceRate === "number" && a.attendanceRate >= 82;
}

/** Не цитировать отчёт, если в тексте явный негатив (эвристика без LLM). */
function reportSnippetLooksHarsh(t: string): boolean {
  return /проблем|слабост|слабо|низк|плохо|отсутств|трудн|сложн|не\s+держ/i.test(
    t
  );
}

function pickSessionReportSnippet(ctx: ArenaParentPlayerContext): string | null {
  const r = ctx.latestSessionReport;
  if (!r) return null;
  const raw =
    [r.parentMessage, r.summary, r.focusAreas].find((x) => x && x.trim()) ?? "";
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length < 18 || t.length > 320) return null;
  if (reportSnippetLooksHarsh(t)) return null;
  return t;
}

function pickPositiveTrendItem(ctx: ArenaParentPlayerContext): string | null {
  const st = ctx.playerStory;
  if (!st || st.lowData || !st.trendItems?.length) return null;
  for (const item of st.trendItems) {
    const t = item.trim().replace(/\s+/g, " ");
    if (t.length < 14) continue;
    if (reportSnippetLooksHarsh(t)) continue;
    if (
      /рост|стабильн|надёжн|уверенн|присутств|вовлеч|собран|скорост|техник|чита|уровн|динамик/i.test(
        t
      )
    ) {
      return t;
    }
  }
  return null;
}

function hasPositiveEvaluationPattern(ctx: ArenaParentPlayerContext): boolean {
  const m = minEvaluation(ctx);
  if (m === null) return false;
  const n = countEvaluationScores(ctx);
  return n >= 2 ? m >= 4 : m >= 4;
}

function hasSolidEvaluationSummary(ctx: ArenaParentPlayerContext): boolean {
  const s = ctx.evaluationSummary;
  if (!s || s.totalEvaluations < 3) return false;
  const checks = [s.avgEffort, s.avgFocus, s.avgDiscipline].filter(
    (x): x is number => typeof x === "number"
  );
  if (checks.length < 2) return false;
  return checks.every((x) => x >= 3.6);
}

/**
 * Возвращает слой только при честном основании в данных; иначе isVisible: false.
 */
export function deriveArenaProgressCue(
  ctx: ArenaParentPlayerContext | null | undefined
): ArenaProgressCue {
  const hidden: ArenaProgressCue = {
    label: "",
    text: "",
    toneVariant: "lowData",
    isVisible: false,
  };

  if (!ctx?.id) return hidden;

  if (isBlockedByEvaluation(ctx)) return hidden;

  const strength = ctx.aiAnalysis?.strengths?.find((x) => x && x.trim());
  if (strength) {
    return {
      label: "Сильная сторона",
      text: clip(
        `В материалах профиля отмечено: ${strength}. Это хорошая опора для следующих шагов.`,
        160
      ),
      toneVariant: "subtlePositive",
      isVisible: true,
    };
  }

  const hl = ctx.latestLiveTrainingSummary?.highlights?.find((x) => x && x.trim());
  if (hl) {
    return {
      label: "Хороший сигнал",
      text: clip(`В сводке по тренировке есть отметка: ${hl}`, 150),
      toneVariant: "subtlePositive",
      isVisible: true,
    };
  }

  if (hasPositiveEvaluationPattern(ctx)) {
    return {
      label: "Стабильность",
      text: clip(
        "По последним оценкам на тренировке прослеживается устойчивый вовлечённый уровень — надёжная база для спокойного роста.",
        160
      ),
      toneVariant: "subtlePositive",
      isVisible: true,
    };
  }

  if (hasSolidEvaluationSummary(ctx)) {
    return {
      label: "Есть опора",
      text: clip(
        "По накопленным оценкам видно ровную динамику усилия и внимания — это помогает планировать шаги без скачков.",
        155
      ),
      toneVariant: "subtlePositive",
      isVisible: true,
    };
  }

  if (hasSolidAttendance(ctx)) {
    const a = ctx.attendanceSummary!;
    return {
      label: "Ритм",
      text: clip(
        `Регулярный выход на лёд (около ${Math.round(a.attendanceRate ?? 0)}% посещений) задаёт предсказуемый ритм для развития.`,
        155
      ),
      toneVariant: "subtlePositive",
      isVisible: true,
    };
  }

  const reportLine = pickSessionReportSnippet(ctx);
  if (reportLine) {
    return {
      label: "Отметка в сессии",
      text: clip(`В материалах с последней сессии: ${reportLine}`, 158),
      toneVariant: "normal",
      isVisible: true,
    };
  }

  const trend = pickPositiveTrendItem(ctx);
  if (trend) {
    return {
      label: "Хороший сигнал",
      text: clip(`В собранной истории развития: ${trend}`, 150),
      toneVariant: "normal",
      isVisible: true,
    };
  }

  return hidden;
}

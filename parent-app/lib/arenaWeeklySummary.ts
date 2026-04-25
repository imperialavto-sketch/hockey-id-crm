/**
 * Детерминированная сводка «неделя игрока» для экрана Арены.
 * Только playerContext — без LLM и без новых запросов.
 */

import type { ArenaParentPlayerContext } from "@/types/arenaParentPlayerContext";
import { ARENA_COPY_ACCUMULATING_SIGNALS, ARENA_COPY_LOW_DATA_CTA } from "@/lib/arenaStateCopy";

export type ArenaWeeklySummary = {
  title: string;
  whatWentWell: string;
  watchAttention: string;
  nextStep: string;
  isLowData: boolean;
};

const clip = (value: string, maxLen: number): string => {
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
};

export function hasAnyPlayerSignal(ctx: ArenaParentPlayerContext): boolean {
  const e = ctx.latestSessionEvaluation;
  const hasEval =
    !!e &&
    (typeof e.effort === "number" ||
      typeof e.focus === "number" ||
      typeof e.discipline === "number" ||
      Boolean(e.note?.trim()));
  const r = ctx.latestSessionReport;
  const hasRep = Boolean(
    r &&
      ((r.summary && r.summary.trim()) ||
        (r.focusAreas && r.focusAreas.trim()) ||
        (r.parentMessage && r.parentMessage.trim()))
  );
  const l = ctx.latestLiveTrainingSummary;
  const hasLive = Boolean(
    l &&
      ((l.shortSummary && l.shortSummary.trim()) ||
        (Array.isArray(l.highlights) && l.highlights.length > 0) ||
        (Array.isArray(l.developmentFocus) && l.developmentFocus.length > 0))
  );
  const hasStory = Boolean(
    ctx.playerStory?.trendItems?.some((t) => t && t.trim())
  );
  const hasEvalSum = Boolean(ctx.evaluationSummary && ctx.evaluationSummary.totalEvaluations > 0);
  const hasAtt =
    ctx.attendanceSummary &&
    ctx.attendanceSummary.totalSessions != null &&
    ctx.attendanceSummary.totalSessions > 0;
  const hasRec = Boolean(
    ctx.coachRecommendations?.some((t) => t && t.trim())
  );
  const ai = ctx.aiAnalysis;
  const hasAi = Boolean(
    (ai?.summary && ai.summary.trim()) ||
      (Array.isArray(ai?.strengths) && ai.strengths.length > 0) ||
      (Array.isArray(ai?.growthAreas) && ai.growthAreas.length > 0)
  );
  const hasStats = Boolean(
    ctx.stats &&
      typeof ctx.stats === "object" &&
      (ctx.stats.games ?? 0) > 0
  );
  return Boolean(
    hasEval ||
      hasRep ||
      hasLive ||
      hasStory ||
      hasEvalSum ||
      hasAtt ||
      hasRec ||
      hasAi ||
      hasStats
  );
}

function minEvaluationScore(ctx: ArenaParentPlayerContext): number | null {
  const e = ctx.latestSessionEvaluation;
  if (!e) return null;
  const nums = [e.effort, e.focus, e.discipline].filter(
    (n): n is number => typeof n === "number"
  );
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

function pickPositive(ctx: ArenaParentPlayerContext): string {
  const live = ctx.latestLiveTrainingSummary;
  if (live?.highlights?.[0]?.trim()) {
    return clip(live.highlights[0], 100);
  }
  const rep = ctx.latestSessionReport;
  if (rep?.summary?.trim()) {
    return clip(rep.summary, 100);
  }
  const str = ctx.aiAnalysis?.strengths?.find((s) => s && s.trim());
  if (str) return clip(str, 100);
  const min = minEvaluationScore(ctx);
  if (min != null && min >= 4) {
    return "По последней оценке тренировки — хороший уровень усилия и вовлечённости.";
  }
  const att = ctx.attendanceSummary;
  if (
    typeof att?.attendanceRate === "number" &&
    att.attendanceRate >= 70 &&
    (att.totalSessions ?? 0) > 0
  ) {
    return `Стабильное посещение: около ${Math.round(att.attendanceRate)}% тренировок.`;
  }
  const st = ctx.stats;
  if (st && (st.points ?? 0) > 0) {
    return clip(`В статистике есть вклад: очки и активность на площадке.`, 100);
  }
  if (ctx.coachRecommendations?.[0]?.trim()) {
    return clip(`Тренер отметил направление: ${ctx.coachRecommendations[0]}`, 100);
  }
  return "Есть зацепки для разговора с тренером — детали появятся с данными.";
}

function pickAttention(ctx: ArenaParentPlayerContext): string {
  const min = minEvaluationScore(ctx);
  if (min != null && min <= 2) {
    return clip(
      "По оценкам последней тренировки есть зона, где стоит поддержать ребёнка спокойнее — без давления.",
      110
    );
  }
  const g = ctx.aiAnalysis?.growthAreas?.find((x) => x && x.trim());
  if (g) return clip(g, 100);
  const fa = ctx.latestSessionReport?.focusAreas?.trim();
  if (fa) return clip(fa, 100);
  const df = ctx.latestLiveTrainingSummary?.developmentFocus?.find((x) => x && x.trim());
  if (df) return clip(df, 100);
  const trend = ctx.playerStory?.trendItems?.find((t) => t && t.trim());
  if (trend) return clip(trend, 100);
  const es = ctx.evaluationSummary;
  if (
    es &&
    es.totalEvaluations > 0 &&
    typeof es.avgFocus === "number" &&
    es.avgFocus < 3.5
  ) {
    return clip("По средним оценкам стоит бережно удерживать внимание на тренировке.", 110);
  }
  return clip("Держите один спокойный фокус на неделю — без скачков между темами.", 100);
}

function pickNextStep(ctx: ArenaParentPlayerContext): string {
  const rec = ctx.coachRecommendations?.find((t) => t && t.trim());
  if (rec) return clip(`Опора на рекомендацию тренера: ${rec}`, 110);
  const pm = ctx.latestSessionReport?.parentMessage?.trim();
  if (pm) return clip(pm, 110);
  const df = ctx.latestLiveTrainingSummary?.developmentFocus?.find((x) => x && x.trim());
  if (df) return clip(`Фокус на ближайшие дни: ${df}`, 110);
  const sn = ctx.latestLiveTrainingSummary?.supportNotes?.find((x) => x && x.trim());
  if (sn) return clip(sn, 110);
  return "Один короткий шаг дома на 10–15 минут — см. сценарии ниже или спросите в чате.";
}

const LOW_DATA_SUMMARY: ArenaWeeklySummary = {
  title: "Итоги недели",
  whatWentWell:
    "Картина недели пока не собрана — мало входящих данных из тренировок и отчётов в приложении.",
  watchAttention: ARENA_COPY_ACCUMULATING_SIGNALS,
  nextStep: ARENA_COPY_LOW_DATA_CTA,
  isLowData: true,
};

/**
 * Свёртка недели для родителя: один позитив, одна зона внимания, один шаг.
 */
export function deriveArenaWeeklySummary(
  ctx: ArenaParentPlayerContext | null | undefined
): ArenaWeeklySummary | null {
  if (!ctx?.id) return null;
  if (!hasAnyPlayerSignal(ctx)) {
    return LOW_DATA_SUMMARY;
  }
  return {
    title: "Неделя игрока",
    whatWentWell: pickPositive(ctx),
    watchAttention: pickAttention(ctx),
    nextStep: pickNextStep(ctx),
    isLowData: false,
  };
}

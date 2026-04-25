/**
 * Детерминированный «интеллект недели» для экрана Арены.
 * Только клиент + уже загруженный ArenaParentPlayerContext — без AI и без новых API.
 */

import type { ArenaParentPlayerContext } from "@/types/arenaParentPlayerContext";
import { ARENA_COPY_LOW_DATA_CTA } from "@/lib/arenaStateCopy";

export type ArenaWeeklyInsight = {
  focus: string;
  signal: string;
  parentTip: string;
  isLowData: boolean;
};

export type ArenaInsightFollowUpAction = {
  analyticsKey: string;
  label: string;
  prompt: string;
};

const clip = (value: string, maxLen: number): string => {
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
};

const firstLine = (value: string | null | undefined, maxLen: number): string => {
  if (value == null || typeof value !== "string") return "";
  const line = value.trim().split(/\n/)[0] ?? "";
  return clip(line, maxLen);
};

function hasEvaluation(ctx: ArenaParentPlayerContext): boolean {
  const e = ctx.latestSessionEvaluation;
  if (!e) return false;
  return (
    typeof e.effort === "number" ||
    typeof e.focus === "number" ||
    typeof e.discipline === "number" ||
    Boolean(e.note && e.note.trim())
  );
}

function hasReport(ctx: ArenaParentPlayerContext): boolean {
  const r = ctx.latestSessionReport;
  if (!r) return false;
  return Boolean(
    (r.summary && r.summary.trim()) ||
      (r.focusAreas && r.focusAreas.trim()) ||
      (r.parentMessage && r.parentMessage.trim())
  );
}

function hasLive(ctx: ArenaParentPlayerContext): boolean {
  const l = ctx.latestLiveTrainingSummary;
  if (!l) return false;
  return Boolean(
    (l.shortSummary && l.shortSummary.trim()) ||
      (Array.isArray(l.highlights) && l.highlights.length > 0) ||
      (Array.isArray(l.developmentFocus) && l.developmentFocus.length > 0)
  );
}

function hasStory(ctx: ArenaParentPlayerContext): boolean {
  const s = ctx.playerStory;
  return Boolean(
    s && Array.isArray(s.trendItems) && s.trendItems.some((t) => t && t.trim())
  );
}

function hasEvalSummary(ctx: ArenaParentPlayerContext): boolean {
  const s = ctx.evaluationSummary;
  return Boolean(s && s.totalEvaluations > 0);
}

function hasAttendance(ctx: ArenaParentPlayerContext): boolean {
  const a = ctx.attendanceSummary;
  if (!a) return false;
  return typeof a.attendanceRate === "number" && a.totalSessions != null && a.totalSessions > 0;
}

function hasRecommendations(ctx: ArenaParentPlayerContext): boolean {
  return Boolean(
    ctx.coachRecommendations &&
      ctx.coachRecommendations.length > 0 &&
      ctx.coachRecommendations.some((t) => t && t.trim())
  );
}

function hasAiAnalysis(ctx: ArenaParentPlayerContext): boolean {
  const a = ctx.aiAnalysis;
  return Boolean(
    (a?.summary && a.summary.trim()) ||
      (Array.isArray(a?.growthAreas) && a.growthAreas.length > 0)
  );
}

function evaluationBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const e = ctx.latestSessionEvaluation;
  if (!e) return null;
  const scores = [
    { k: "усилие", v: e.effort },
    { k: "внимание", v: e.focus },
    { k: "дисциплина", v: e.discipline },
  ].filter((x) => typeof x.v === "number") as { k: string; v: number }[];
  const minV = scores.length ? Math.min(...scores.map((x) => x.v)) : null;
  const note = firstLine(e.note, 96);

  let focus =
    minV != null && minV <= 2
      ? "Стабильность и спокойствие на тренировке"
      : "Закрепить то, что уже растёт";
  if (note && note.length > 12) {
    focus = clip(`От тренера: ${note}`, 88);
  }

  const parts: string[] = [];
  if (typeof e.effort === "number") parts.push(`усилие ${e.effort}/5`);
  if (typeof e.focus === "number") parts.push(`внимание ${e.focus}/5`);
  if (typeof e.discipline === "number") parts.push(`дисциплина ${e.discipline}/5`);
  let signal = parts.length ? `Оценки: ${parts.join(" · ")}` : "Есть свежая оценка с тренировки";
  if (note && !signal.includes(note.slice(0, 20))) {
    signal = clip(`${signal}. ${note}`, 120);
  }

  const parentTip =
    minV != null && minV <= 2
      ? "После льда — коротко и тепло: без разбора ошибок «на ковре», достаточно одного наблюдения."
      : "Спросите, что запомнилось с тренировки одной фразой — без оценок «молодец/нет».";

  return { focus, signal, parentTip, isLowData: false };
}

function reportBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const r = ctx.latestSessionReport;
  if (!r) return null;
  const focus =
    firstLine(r.focusAreas, 88) ||
    firstLine(r.summary, 88) ||
    "Фокус из последнего отчёта тренера";
  const signal =
    firstLine(r.parentMessage, 100) ||
    firstLine(r.summary, 100) ||
    firstLine(r.focusAreas, 100) ||
    "В отчёте есть ориентиры для дома и льда.";
  const parentTip =
    "Опирайтесь на формулировки тренера — не усугубляйте и не добавляйте жёстких выводов сверх её слов.";
  return { focus, signal, parentTip, isLowData: false };
}

function liveBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const l = ctx.latestLiveTrainingSummary;
  if (!l) return null;
  const focus =
    (l.developmentFocus && l.developmentFocus[0] && firstLine(l.developmentFocus[0], 88)) ||
    "По последним live-наблюдениям";
  const signal =
    firstLine(l.shortSummary, 110) ||
    (l.highlights?.[0] ? firstLine(l.highlights[0], 110) : "") ||
    "Есть краткая сводка активности на тренировке.";
  const parentTip =
    "Если формулировки неясны — зафиксируйте вопрос и уточните у тренера в удобный момент.";
  return { focus, signal, parentTip, isLowData: false };
}

function storyBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const items = ctx.playerStory?.trendItems?.filter((t) => t && t.trim()) ?? [];
  if (items.length === 0) return null;
  const low = ctx.playerStory?.lowData;
  const focus = low
    ? "Мало опорных точек — мягкий фокус недели"
    : "Ориентир по недавним наблюдениям в профиле";
  const signal = clip(items[0], 120);
  const parentTip = low
    ? "Формулировки пока общие — по мере новых отчётов фокус обычно конкретизируется. " +
      ARENA_COPY_LOW_DATA_CTA
    : "Держите один спокойный фокус на неделю — без скачков между темами.";
  return { focus, signal, parentTip, isLowData: Boolean(low) };
}

function evalSummaryBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const s = ctx.evaluationSummary;
  if (!s || s.totalEvaluations <= 0) return null;
  const parts: string[] = [`оценок в выборке: ${s.totalEvaluations}`];
  if (typeof s.avgEffort === "number") parts.push(`ср. усилие ${s.avgEffort}`);
  if (typeof s.avgFocus === "number") parts.push(`ср. внимание ${s.avgFocus}`);
  if (typeof s.avgDiscipline === "number") parts.push(`ср. дисциплина ${s.avgDiscipline}`);
  return {
    focus: "Стабильность по оценкам тренировок",
    signal: clip(parts.join(" · "), 120),
    parentTip:
      "Не гонитесь за идеальными баллами — смотрите на устойчивость из недели в неделю.",
    isLowData: false,
  };
}

function attendanceBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const a = ctx.attendanceSummary;
  if (!a || a.totalSessions == null || a.totalSessions <= 0) return null;
  const rate =
    typeof a.attendanceRate === "number" ? `${Math.round(a.attendanceRate)}%` : "—";
  return {
    focus: "Регулярность на площадке",
    signal: clip(
      `Посещаемость: ${rate} (${a.presentCount ?? "—"}/${a.totalSessions} тренировок).`,
      120
    ),
    parentTip: "Стабильный ритм занятий часто важнее разовых прорывов — берегите восстановление.",
    isLowData: false,
  };
}

function recommendationsBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const recs = ctx.coachRecommendations?.filter((t) => t && t.trim()) ?? [];
  if (recs.length === 0) return null;
  return {
    focus: "Фокус из рекомендаций тренера",
    signal: clip(recs[0], 120),
    parentTip: "Выберите одну рекомендацию на неделю и проживите её спокойно — без списка из десяти задач.",
    isLowData: false,
  };
}

function aiBucket(ctx: ArenaParentPlayerContext): ArenaWeeklyInsight | null {
  const a = ctx.aiAnalysis;
  if (!a) return null;
  const growth = a.growthAreas?.[0];
  const focus =
    (growth && firstLine(growth, 88)) ||
    firstLine(a.summary, 88) ||
    "Ориентир из AI-обзора профиля";
  const signal = firstLine(a.summary, 110) || "Есть краткий разбор в приложении.";
  const parentTip = "Сопоставляйте AI-обзор с тем, что видите на льду и что говорит тренер.";
  return { focus, signal, parentTip, isLowData: false };
}

function lowDataFallback(childName?: string): ArenaWeeklyInsight {
  const nameBit = childName?.trim() ? ` для ${childName.trim()}` : "";
  return {
    focus: "Неделя без плотного фокуса",
    signal: `Пока мало опорных данных${nameBit}, чтобы зафиксировать чёткий приоритет недели. Это нормально на старте — по мере тренировок и отчётов тренера ориентир для недели обычно проясняется.`,
    parentTip: ARENA_COPY_LOW_DATA_CTA,
    isLowData: true,
  };
}

/**
 * Приоритет: оценка последней тренировки → отчёт → live → тренды story → сводка оценок → посещаемость → рекомендации → AI-обзор → fallback.
 */
export function deriveArenaWeeklyInsight(
  ctx: ArenaParentPlayerContext | null | undefined
): ArenaWeeklyInsight | null {
  if (!ctx || !ctx.id) return null;

  if (hasEvaluation(ctx)) {
    const out = evaluationBucket(ctx);
    if (out) return out;
  }
  if (hasReport(ctx)) {
    const out = reportBucket(ctx);
    if (out) return out;
  }
  if (hasLive(ctx)) {
    const out = liveBucket(ctx);
    if (out) return out;
  }
  if (hasStory(ctx)) {
    const out = storyBucket(ctx);
    if (out) return out;
  }
  if (hasEvalSummary(ctx)) {
    const out = evalSummaryBucket(ctx);
    if (out) return out;
  }
  if (hasAttendance(ctx)) {
    const out = attendanceBucket(ctx);
    if (out) return out;
  }
  if (hasRecommendations(ctx)) {
    const out = recommendationsBucket(ctx);
    if (out) return out;
  }
  if (hasAiAnalysis(ctx)) {
    const out = aiBucket(ctx);
    if (out) return out;
  }

  return lowDataFallback(ctx.name);
}

export function deriveArenaInsightFollowUps(
  ctx: ArenaParentPlayerContext | null | undefined
): ArenaInsightFollowUpAction[] {
  if (!ctx || !ctx.id) return [];

  const hasEval = hasEvaluation(ctx);
  const hasRep = hasReport(ctx);
  const hasTrend = hasStory(ctx);
  const hasLowData = !hasEval && !hasRep && !hasTrend && !hasLive(ctx);

  const actions: ArenaInsightFollowUpAction[] = [];

  if (hasEval || hasRep || hasLive(ctx)) {
    actions.push({
      analyticsKey: "insight_followup_last_training",
      label: "Разобрать тренировку",
      prompt:
        "Разбери последнюю тренировку игрока простыми словами: что получилось, что мешало и на чем сейчас лучше сфокусироваться. Если данных мало — честно скажи и предложи, что отследить на следующей тренировке.",
    });
  }

  if (hasEval || hasRep) {
    actions.push({
      analyticsKey: "insight_followup_home_help",
      label: "Как помочь дома",
      prompt:
        "Подскажи, как родителю помочь ребёнку дома 10–15 минут в ближайшие дни без давления. Дай один конкретный фокус, одно упражнение и как понять, что идем в правильном направлении.",
    });
  }

  if (hasTrend || hasEvalSummary(ctx) || hasAttendance(ctx)) {
    actions.push({
      analyticsKey: "insight_followup_meaning_growth",
      label: "Что это значит для роста",
      prompt:
        "Объясни, что по последним данным и наблюдениям это может значить для развития игрока в ближайшие недели. Раздели: что видно по данным и что пока только гипотеза. Заверши одним следующим шагом для семьи.",
    });
  }

  if (hasLowData) {
    return [
      {
        analyticsKey: "insight_followup_start_here",
        label: "С чего начать",
        prompt:
          "С чего логичнее начать развитие игрока прямо сейчас, если данных пока мало? Дай простой план на 7 дней: 1 главный фокус, 2–3 коротких действия и что спросить у тренера.",
      },
      {
        analyticsKey: "insight_followup_help_child",
        label: "Как помочь ребёнку",
        prompt:
          "Как поддержать ребёнка в тренировочном процессе без давления, если данных пока немного? Дай родителю понятный тон общения и один следующий шаг на ближайшую неделю.",
      },
    ];
  }

  return actions.slice(0, 3);
}

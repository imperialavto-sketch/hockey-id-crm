/**
 * Детерминированный «фокус на сегодня» для экрана Арены.
 * Без LLM и новых запросов — только playerContext.
 */

import type { CoachMarkPlayerContext } from "@/services/chatService";
import { hasAnyPlayerSignal } from "@/lib/arenaWeeklySummary";
import { ARENA_COPY_ACCUMULATING_SIGNALS } from "@/lib/arenaStateCopy";

export type ArenaTodayFocus = {
  title: string;
  focus: string;
  parentStep: string;
  ctaLabel: string;
  ctaPrompt: string;
  ctaAnalyticsKey: string;
  isLowData: boolean;
};

const clip = (value: string, maxLen: number): string => {
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
};

function minEval(ctx: CoachMarkPlayerContext): number | null {
  const e = ctx.latestSessionEvaluation;
  if (!e) return null;
  const n = [e.effort, e.focus, e.discipline].filter(
    (x): x is number => typeof x === "number"
  );
  return n.length ? Math.min(...n) : null;
}

const PROMPT_PLAN_TODAY =
  "Составь короткий план на сегодня для игрока простыми словами: на чём сфокусироваться, что можно сделать дома 10 минут и как родителю поддержать без давления. Опирайся на данные из контекста; если их мало — честно скажи и дай один безопасный общий шаг.";

const PROMPT_HOME_TODAY =
  "Подскажи одно конкретное действие дома сегодня на 10–15 минут без спецплощадки и как родителю помочь без давления. Используй данные игрока из контекста; если их недостаточно — скажи честно и дай осторожный общий ориентир.";

const PROMPT_WATCH_TODAY =
  "На что обратить внимание сегодня — на льду или в коротком разговоре с ребёнком: одна чёткая мысль, без давления. Опирайся на контекст; при нехватке данных скажи это и предложи, что уточнить у тренера.";

const PROMPT_START_TODAY =
  "С чего начать сегодня, если в приложении пока мало сигналов? Один простой фокус на день и один конкретный шаг для родителя — коротко и спокойно.";

const LOW_TODAY: ArenaTodayFocus = {
  title: "Сегодня",
  focus: "Фокус дня уточним, когда накопятся сигналы",
  parentStep: ARENA_COPY_ACCUMULATING_SIGNALS,
  ctaLabel: "С чего начать",
  ctaPrompt: PROMPT_START_TODAY,
  ctaAnalyticsKey: "arena_today_start",
  isLowData: true,
};

/**
 * Узкий «день»: одна строка фокуса, один шаг родителю, один CTA в чат.
 */
export function deriveArenaTodayFocus(
  ctx: CoachMarkPlayerContext | null | undefined
): ArenaTodayFocus | null {
  if (!ctx?.id) return null;

  if (!hasAnyPlayerSignal(ctx)) {
    return LOW_TODAY;
  }

  const m = minEval(ctx);
  const live = ctx.latestLiveTrainingSummary;
  const rep = ctx.latestSessionReport;
  const rec = ctx.coachRecommendations?.find((t) => t && t.trim());
  const growth = ctx.aiAnalysis?.growthAreas?.find((g) => g && g.trim());

  let focus = "";
  let parentStep = "";
  let ctaLabel = "План на сегодня";
  let ctaPrompt = PROMPT_PLAN_TODAY;
  let ctaAnalyticsKey = "arena_today_plan";

  const df = live?.developmentFocus?.find((x) => x && x.trim());
  const sn = live?.supportNotes?.find((x) => x && x.trim());
  const fa = rep?.focusAreas?.trim();

  if (m != null && m <= 2) {
    focus = clip("Сегодня — спокойный режим: повтор и внимание без давления.", 88);
    parentStep = clip("Короткое «как прошло» — одной фразой, без разбора ошибок.", 88);
    ctaLabel = "На что обратить внимание";
    ctaPrompt = PROMPT_WATCH_TODAY;
    ctaAnalyticsKey = "arena_today_watch";
  } else if (growth) {
    focus = clip(`Сегодняшний угол: ${growth}`, 88);
    parentStep = clip("Один маленький шаг в тему — не три задачи сразу.", 72);
    ctaLabel = "На что обратить внимание";
    ctaPrompt = PROMPT_WATCH_TODAY;
    ctaAnalyticsKey = "arena_today_watch";
  } else if (df) {
    focus = clip(df, 88);
    parentStep = sn
      ? clip(sn, 88)
      : clip("Поддержите фокус коротким напоминанием утром или перед сбором.", 88);
    ctaLabel = "План на сегодня";
    ctaPrompt = PROMPT_PLAN_TODAY;
    ctaAnalyticsKey = "arena_today_plan";
  } else if (fa) {
    focus = clip(fa, 88);
    parentStep = rep?.parentMessage?.trim()
      ? clip(rep.parentMessage, 88)
      : clip("Сверьтесь с формулировкой тренера — без добавления своих жёстких выводов.", 88);
    ctaLabel = "План на сегодня";
    ctaPrompt = PROMPT_PLAN_TODAY;
    ctaAnalyticsKey = "arena_today_plan";
  } else if (rec) {
    focus = clip(`Сегодня опираемся на совет тренера: ${rec}`, 96);
    parentStep = clip("Выберите одну мысль из этого и проживите день спокойно.", 72);
    ctaLabel = "Что сделать дома";
    ctaPrompt = PROMPT_HOME_TODAY;
    ctaAnalyticsKey = "arena_today_home";
  } else if (ctx.latestSessionEvaluation?.note?.trim()) {
    const note = ctx.latestSessionEvaluation.note.trim().split(/\n/)[0] ?? "";
    focus = clip(note, 88);
    parentStep = clip("Одна тёплая реплика после занятия — без оценки «молодец/нет».", 88);
    ctaLabel = "На что обратить внимание";
    ctaPrompt = PROMPT_WATCH_TODAY;
    ctaAnalyticsKey = "arena_today_watch";
  } else if (rep?.summary?.trim()) {
    focus = clip(rep.summary, 88);
    parentStep = clip("Коротко напомните ребёнку одну мысль из тренера — своими словами.", 88);
    ctaLabel = "План на сегодня";
    ctaPrompt = PROMPT_PLAN_TODAY;
    ctaAnalyticsKey = "arena_today_plan";
  } else {
    focus = clip("Сегодня — один спокойный приоритет на развитие.", 72);
    parentStep = clip("10 минут внимания дома или на площадке — без перегруза.", 72);
    ctaLabel = "План на сегодня";
    ctaPrompt = PROMPT_PLAN_TODAY;
    ctaAnalyticsKey = "arena_today_plan";
  }

  return {
    title: "Фокус на сегодня",
    focus,
    parentStep,
    ctaLabel,
    ctaPrompt,
    ctaAnalyticsKey,
    isLowData: false,
  };
}

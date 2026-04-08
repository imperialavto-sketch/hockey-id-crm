/**
 * Один тонкий proactive-nudge для Арены: только локальные данные, без LLM и без fetch.
 * Максимум один сигнал; часто скрыт, чтобы не спамить.
 */

import type { CoachMarkPlayerContext } from "@/services/chatService";
import type { ArenaContinuitySnapshot } from "@/services/coachMarkMemory";
import type { ArenaTodayFocus } from "@/lib/arenaTodayFocus";
import type { ArenaWeeklyInsight } from "@/lib/arenaWeeklyInsight";
import { hasAnyPlayerSignal } from "@/lib/arenaWeeklySummary";

const MS_DAY = 86400000;

export type ArenaProactiveNudge = {
  kicker: string;
  text: string;
  ctaLabel: string;
  ctaPrompt: string;
  analyticsKey: string;
  isVisible: boolean;
};

/** Re-entry обычно до ~4 дн.; чуть позже — мягкое «обновить фокус», без дубля re-entry */
const CONTINUITY_PAUSE_MIN_DAYS = 5;
const CONTINUITY_PAUSE_MAX_DAYS = 10;

function continuityAgeDays(snapshot: ArenaContinuitySnapshot): number {
  const t = new Date(snapshot.updatedAt).getTime();
  if (!Number.isFinite(t)) return 0;
  return (Date.now() - t) / MS_DAY;
}

function stackAlreadyRich(
  today: ArenaTodayFocus | null,
  insight: ArenaWeeklyInsight | null
): boolean {
  return Boolean(today && !today.isLowData && insight && !insight.isLowData);
}

/** Insight уже «про тренировку/лёд» — не дублируем разбором */
function insightAlreadyTrainingFacing(insight: ArenaWeeklyInsight): boolean {
  const bundle = `${insight.focus} ${insight.signal}`.toLowerCase();
  return /трениров|льд|оценк|разбор|сесс|live|сводк/i.test(bundle);
}

/** Тексты инсайта уже про внимание / зону поддержки */
function insightAlreadySoftSupport(insight: ArenaWeeklyInsight): boolean {
  const bundle = `${insight.focus} ${insight.signal} ${insight.parentTip}`.toLowerCase();
  return /поддерж|спокой|вниман|зон|береж|без\s+давлен/i.test(bundle);
}

const hidden: ArenaProactiveNudge = {
  kicker: "",
  text: "",
  ctaLabel: "",
  ctaPrompt: "",
  analyticsKey: "",
  isVisible: false,
};

export function deriveArenaProactiveNudge(
  ctx: CoachMarkPlayerContext | null | undefined,
  continuity: ArenaContinuitySnapshot | null | undefined,
  today: ArenaTodayFocus | null,
  insight: ArenaWeeklyInsight | null,
  reentryVisible: boolean
): ArenaProactiveNudge {
  if (!ctx?.id || !insight) return hidden;
  if (reentryVisible) return hidden;
  if (!hasAnyPlayerSignal(ctx)) return hidden;
  if (stackAlreadyRich(today, insight)) return hidden;

  const weakStack = Boolean(
    (today && today.isLowData) || (insight && insight.isLowData)
  );

  const e = ctx.latestSessionEvaluation;
  const focus = typeof e?.focus === "number" ? e.focus : null;
  const discipline = typeof e?.discipline === "number" ? e.discipline : null;
  const scores = [e?.effort, e?.focus, e?.discipline].filter(
    (x): x is number => typeof x === "number"
  );
  const minScore = scores.length ? Math.min(...scores) : null;

  const live = ctx.latestLiveTrainingSummary;
  const hasLive = Boolean(
    live &&
      ((live.shortSummary && live.shortSummary.trim()) ||
        (live.highlights && live.highlights.some((h) => h && h.trim())) ||
        (live.developmentFocus && live.developmentFocus.some((d) => d && d.trim())))
  );

  const rep = ctx.latestSessionReport;
  const hasSubstantiveReport = Boolean(
    rep &&
      ((rep.summary && rep.summary.trim().length > 24) ||
        (rep.parentMessage && rep.parentMessage.trim().length > 24) ||
        (rep.focusAreas && rep.focusAreas.trim().length > 24))
  );

  const todayNarrowsEval =
    today && !today.isLowData && /спокойн|оценк|вниман|режим/i.test(`${today.focus} ${today.parentStep}`);

  // 1) Напряжённая последняя оценка
  if (minScore !== null && minScore <= 2 && scores.length >= 1) {
    if (!insightAlreadySoftSupport(insight) && !todayNarrowsEval) {
      return {
        kicker: "На заметку",
        text: "По последней оценке есть мягкое напряжение — его можно спокойно разобрать на бытовой язык.",
        ctaLabel: "Что это значит",
        ctaPrompt:
          "Разбери последнюю оценку тренировки из контекста простыми словами для родителя: что это может значить и один конкретный следующий шаг без давления на ребёнка. Только по данным; если мало сигналов — скажи честно.",
        analyticsKey: "arena_proactive_eval_clarify",
        isVisible: true,
      };
    }
  }

  // 2) Слабое внимание при более ровных других оценках (если есть ≥2 метрики)
  if (
    focus !== null &&
    focus <= 2 &&
    scores.length >= 2 &&
    minScore !== null &&
    minScore > 2
  ) {
    if (!insightAlreadySoftSupport(insight)) {
      return {
        kicker: "",
        text: "Имеет смысл присмотреться к вниманию на тренировке — это часто зона спокойной опоры, а не давления.",
        ctaLabel: "Как поддержать",
        ctaPrompt:
          "Сфокусируйся на внимании на тренировке по данным контекста. Дай родителю одну ясную мысль и один мягкий шаг в поддержку ребёнка, без давления. Если данных мало — скажи честно.",
        analyticsKey: "arena_proactive_focus_support",
        isVisible: true,
      };
    }
  }

  // Гейты: ниже — только если «шапка» не перегружена смыслом недели
  if (!weakStack && !insight.isLowData) return hidden;

  // 3) Live-сводка, а инсайт ещё не «про лёд»
  if (hasLive && !insightAlreadyTrainingFacing(insight)) {
    return {
      kicker: "",
      text: "Есть свежая опорная сводка с льда — её можно коротко перевести на понятные шаги.",
      ctaLabel: "Разобрать",
      ctaPrompt:
        "Разбери свежую live-сводку из контекста простыми словами: что важно родителю и один следующий шаг. Если данных мало — честно опиши ограничение.",
      analyticsKey: "arena_proactive_live_digest",
      isVisible: true,
    };
  }

  // 4) Отчёт + есть цифры оценки — связать в один ориентир
  if (hasSubstantiveReport && scores.length > 0) {
    return {
      kicker: "",
      text: "Рядом лежат отчёт тренера и оценки — их можно свести в один спокойный ориентир.",
      ctaLabel: "Свести воедино",
      ctaPrompt:
        "По данным контекста свяжи последний отчёт тренера и оценки в короткий ориентир для родителя: главная мысль и один шаг на ближайшие дни. Без выдумок.",
      analyticsKey: "arena_proactive_report_bridge",
      isVisible: true,
    };
  }

  // 5) Посещаемость
  const att = ctx.attendanceSummary;
  if (
    att &&
    typeof att.attendanceRate === "number" &&
    att.attendanceRate < 72 &&
    (att.totalSessions ?? 0) >= 4
  ) {
    return {
      kicker: "",
      text: "Ритм выхода на лёд чуть проседает — это можно обсудить без давления и с опорой на факты.",
      ctaLabel: "Что дальше",
      ctaPrompt:
        "По посещаемости из контекста предложи родителю спокойный разговор: что может мешать ритму и один бережный шаг на ближайшие две недели. Без морали.",
      analyticsKey: "arena_proactive_attendance_rhythm",
      isVisible: true,
    };
  }

  // 6) Устойчиво низкое внимание по сводке оценок
  const es = ctx.evaluationSummary;
  if (
    es &&
    es.totalEvaluations >= 4 &&
    typeof es.avgFocus === "number" &&
    es.avgFocus < 3.25 &&
    insight.isLowData
  ) {
    return {
      kicker: "",
      text: "По накопленным оценкам внимание на тренировке выглядит уязвимее — хороший момент для короткого смысла, а не давления.",
      ctaLabel: "Что это значит",
      ctaPrompt:
        "Опираясь на сводку оценок в контексте, объясни родителю простыми словами, что может значить более низкое среднее внимание и как мягко поддержать. Один шаг на неделю.",
      analyticsKey: "arena_proactive_focus_trend",
      isVisible: true,
    };
  }

  // 7) Заметная линия в story
  const story = ctx.playerStory;
  if (
    story &&
    !story.lowData &&
    story.trendItems?.some((t) => t && t.trim().length > 18) &&
    insight.isLowData
  ) {
    return {
      kicker: "",
      text: "В линии развития виден заметный сигнал — можно коротко проговорить, что это значит на практике.",
      ctaLabel: "Разобрать",
      ctaPrompt:
        "По строкам истории развития из контекста коротко объясни родителю практический смысл и один спокойный следующий шаг. Если данных мало — скажи прямо.",
      analyticsKey: "arena_proactive_story_thread",
      isVisible: true,
    };
  }

  // 8) Пауза после прошлого диалога (re-entry уже скрыт по возрасту)
  if (continuity && insight.isLowData && weakStack) {
    const age = continuityAgeDays(continuity);
    if (age >= CONTINUITY_PAUSE_MIN_DAYS && age <= CONTINUITY_PAUSE_MAX_DAYS) {
      return {
        kicker: "",
        text: "Контекст прошлого разговора немного отошёл — можно спокойно обновить фокус на эту неделю.",
        ctaLabel: "Обновить фокус",
        ctaPrompt:
          "Что сейчас логичнее держать в фокусе на этой неделе? Ответь по-родительски и по данным из контекста; если сигналов мало — скажи честно и дай безопасный ориентир.",
        analyticsKey: "arena_proactive_week_refresh",
        isVisible: true,
      };
    }
  }

  return hidden;
}
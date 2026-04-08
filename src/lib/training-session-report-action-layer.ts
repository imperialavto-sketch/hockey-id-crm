/**
 * Практические подсказки для тренера из слоя аналитики отчётов.
 * Только эвристики; не оценка навыка и не «диагноз».
 */

import type { CoachTrainingSessionReportAnalyticsDto } from "./training-session-report-analytics";

export type CoachTrainingSessionReportActionLayerDto = {
  priorityActions: string[];
  reinforcementAreas: string[];
  nextSessionFocus: string[];
  confidence: "low" | "moderate" | "high";
  rationale?: string[];
};

const LABEL_MAX = 100;

function truncateLabel(s: string, max = LABEL_MAX): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .slice(0, 96);
}

function sessionsCountPhrase(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} сессия`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} сессии`;
  return `${n} сессий`;
}

function resolveConfidence(a: CoachTrainingSessionReportAnalyticsDto): CoachTrainingSessionReportActionLayerDto["confidence"] {
  const { dataSufficiency, recentTrend, attentionSignals, recurringFocusThemes } = a;
  if (dataSufficiency === "none" || dataSufficiency === "low") return "low";
  const strongThemes = recurringFocusThemes.filter((t) => t.sessionsCount >= 3).length;
  const hasRepeat = attentionSignals.length > 0;
  if (dataSufficiency === "rich" && recentTrend.kind !== "mixed" && (hasRepeat || strongThemes >= 1)) {
    return "high";
  }
  if (dataSufficiency === "rich" && recentTrend.kind === "mixed") return "moderate";
  if (dataSufficiency === "moderate") return "moderate";
  return "moderate";
}

/**
 * Строит слой «что делать дальше» из уже посчитанной аналитики (история только канонических отчётов).
 */
export function buildCoachTrainingSessionReportActionLayer(
  analytics: CoachTrainingSessionReportAnalyticsDto
): CoachTrainingSessionReportActionLayerDto {
  const n = analytics.reportCount;
  const confidence = resolveConfidence(analytics);
  const rationale: string[] = [
    `Ориентир по сохранённым отчётам тренировок с явкой игрока: ${sessionsCountPhrase(n)}. Это подсказки, а не оценка уровня.`,
  ];
  if (confidence === "low") {
    rationale.push("Мало пересекающихся данных — решения на льду важнее автоматического текста.");
  }

  if (analytics.dataSufficiency === "none") {
    return {
      priorityActions: [
        "Сохраняйте отчёт после тренировки в CRM (сводка или фокусы) — когда появится история, подсказки станут конкретнее.",
      ],
      reinforcementAreas: [
        "Пока опирайтесь на живое наблюдение и план группы: текстовая история не заменяет глаз тренера.",
      ],
      nextSessionFocus: [
        "После занятия — одна строка «что закрепляем» и одна «на что смотрю» в отчёте: этого достаточно для старта.",
      ],
      confidence: "low",
      rationale,
    };
  }

  const priorityActions: string[] = [];
  const usedKeys = new Set<string>();

  const pushPriority = (text: string, dedupeFrom: string) => {
    if (priorityActions.length >= 4) return;
    const k = normKey(dedupeFrom);
    if (!k || usedKeys.has(k)) return;
    usedKeys.add(k);
    priorityActions.push(text);
  };

  for (const att of analytics.attentionSignals) {
    const lab = truncateLabel(att.label);
    pushPriority(
      `Повторяется в отчётах: «${lab}». На ближайшее время: один ясный критерий успеха для игрока и короткий блок с немедленной обратной связью — без длинной лекции.`,
      att.label
    );
  }

  const minSessionsForTheme =
    analytics.dataSufficiency === "low" ? 1 : analytics.reportCount >= 4 ? 2 : 1;

  for (const th of analytics.recurringFocusThemes) {
    if (th.sessionsCount < minSessionsForTheme) continue;
    const lab = truncateLabel(th.label);
    pushPriority(
      `Часто всплывает фокус: «${lab}». Имеет смысл сознательно вернуться к нему в плане 1–2 тренировок и проверить, держится ли прогресс.`,
      th.label
    );
  }

  if (priorityActions.length === 0) {
    if (analytics.dataSufficiency === "low") {
      pushPriority(
        "Пока мало пересечений в текстах — зафиксируйте в следующем отчёте один приоритет и одно наблюдение по группе, чтобы история стала ровнее.",
        "low-data-generic"
      );
    } else {
      pushPriority(
        "Явных «повторов» в формулировках мало — выберите вручную один приоритет на неделю и отразите его в отчётах два раза подряд для ясности.",
        "no-repeat-generic"
      );
    }
  }

  if (analytics.dataSufficiency === "low" && priorityActions.length > 2) {
    priorityActions.length = 2;
  }

  const reinforcementAreas: string[] = [];

  if (analytics.recentTrend.kind === "improving") {
    reinforcementAreas.push(
      "По формулировкам в последних отчётах заметен сдвиг к более позитивному тону — поддержите то, что уже работает, и не перегружайте новыми акцентами без необходимости."
    );
  } else if (analytics.recentTrend.kind === "stable") {
    reinforcementAreas.push(
      "Динамика по текстам отчётов ровная — уместно углубить качество уже выбранных акцентов, а не менять направление каждую тренировку."
    );
  } else {
    reinforcementAreas.push(
      "Формулировки в отчётах местами расходятся — опирайтесь на то, что видите на льду, и кратко синхронизируйте это в следующем отчёте."
    );
  }

  if (analytics.recurringFocusThemes[0]) {
    const top = truncateLabel(analytics.recurringFocusThemes[0].label, 90);
    reinforcementAreas.push(
      `Линия «${top}» чаще других фигурирует в отчётах — имеет смысл продолжать опираться на неё, пока не появится устойчивый результат.`
    );
  }

  if (analytics.recentTrend.kind === "improving" && analytics.attentionSignals.length > 0) {
    reinforcementAreas.push(
      "Параллельно мягко дожимайте повторяющуюся тему из отчётов — без резкой смены всего плана: точечная коррекция обычно достаточна."
    );
  }

  if (reinforcementAreas.length < 2) {
    reinforcementAreas.push(
      "После ключевых блоков кратко фиксируйте в отчёте, что уже держится — так проще не потерять нить между тренировками."
    );
  }

  reinforcementAreas.splice(3);

  const nextSessionFocus: string[] = [];
  const primary =
    analytics.attentionSignals[0]?.label ?? analytics.recurringFocusThemes[0]?.label ?? null;

  if (primary) {
    const p = truncateLabel(primary, 85);
    nextSessionFocus.push(`Старт занятия: 5–7 минут на чек по теме «${p}» — что уже держится, что ещё «плавает».`);
    nextSessionFocus.push(`2–3 повторения с одной фразой обратной связи сразу после каждого — игрок слышит критерий, а не общий совет.`);
  } else {
    nextSessionFocus.push("Выберите один микро-фокус на сегодня и озвучьте его группе в начале — в конце коротко отразите в отчёте.");
    nextSessionFocus.push("Один круг упражнения с акцентом на качество, а не скорость — зафиксируйте наблюдение одной строкой в отчёте.");
  }

  if (analytics.recentTrend.kind === "mixed" && nextSessionFocus.length < 3) {
    nextSessionFocus.push(
      "Если картина в отчётах смешанная — в конце тренировки согласуйте с ассистентом одно наблюдение, чтобы не разъезжались формулировки."
    );
  }

  nextSessionFocus.splice(3);

  if (analytics.attentionSignals.length >= 2 && analytics.recurringFocusThemes.length >= 3) {
    rationale.push("Несколько разных тем в отчётах — трактуйте приоритеты как гипотезы, а не как жёсткий вердикт.");
  }

  return {
    priorityActions,
    reinforcementAreas,
    nextSessionFocus,
    confidence,
    rationale,
  };
}

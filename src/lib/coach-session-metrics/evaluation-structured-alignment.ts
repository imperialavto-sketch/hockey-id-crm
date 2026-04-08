/**
 * Hockey ID — нормализация смыслов между слоями данных тренировки.
 *
 * Канонические роли (не сливать без явного продуктового решения):
 * - **Quick evaluation** (`PlayerSessionEvaluation`): быстрый субъективный срез на сессию, удобный оперативный UI / демо.
 * - **Structured metrics** (`PlayerSessionStructuredMetrics`): накопительный структурированный слой для развития, аналитики и таймлайнов.
 * - **Voice**: сырой/извлечённый ввод и наблюдения; обязателен review и явное сопоставление; не SSOT по умолчанию.
 * - **Reports** (`TrainingSessionReport` / `PlayerSessionReport`): нарратив для людей и родителей; не источник истины для structured analytics.
 *
 * Пересечения по названиям (focus, discipline) не означают идентичность смысла между слоями — только общую шкалу 1–5 там, где она используется.
 *
 * **Guided suggestions (coach-app):** алгоритм «подсказка → явное применение» для behavioral осей
 * в `coach-app/lib/behavioralStructuredSuggestions.ts`; кандидаты из live-сигналов (behavior/attention|discipline) —
 * GET `/api/trainings/[id]/behavioral-suggestions`.
 */

export type HockeyIdMetricLayerId =
  | "quick_evaluation"
  | "structured_metrics"
  | "voice_observations"
  | "narrative_report";

/** Статическое описание владения слоем — для документации, админки и будущих guardrails. */
export function metricLayerOwnershipGuide(): Record<
  HockeyIdMetricLayerId,
  { title: string; responsibility: string }
> {
  return {
    quick_evaluation: {
      title: "Быстрая оценка (сессия)",
      responsibility:
        "Оперативные 1–5 и короткая заметка на тренировку; не заменяет structured foundation.",
    },
    structured_metrics: {
      title: "Structured metrics (Hockey ID)",
      responsibility:
        "Структурированные оси и бакеты JSON для развития игрока и последующей аналитики.",
    },
    voice_observations: {
      title: "Голос / черновик",
      responsibility:
        "Транскрипт и наблюдения после review; запись в foundation только через явное подтверждение маппинга.",
    },
    narrative_report: {
      title: "Отчёт (текст)",
      responsibility:
        "Итог и сообщения родителям; narrative, не канон для числовых метрик.",
    },
  };
}

export type OverlappingAxisAlignment = {
  /** Поле в `PlayerSessionEvaluation` */
  quickField: "focus" | "discipline" | "effort";
  /** Логический путь в structured JSON */
  structuredPath: string;
  /** Одинаковая шкала 1–5 (где применимо). */
  sameNumericScale: boolean;
  /**
   * Автоматическое копирование значения между слоями запрещено: смысл и контекст различаются.
   * Допустимы только подсказки (prefill) или предложения после voice review с подтверждением тренера.
   */
  autoSyncAllowed: false;
  note: string;
};

/**
 * Явный перечень пересечений quick ↔ structured.
 * `effort` в structured текущем UI-slice нет — односторонняя специфика quick-only.
 */
export function explainEvaluationVsStructuredOverlaps(): readonly OverlappingAxisAlignment[] {
  return [
    {
      quickField: "focus",
      structuredPath: "behavioral.focus",
      sameNumericScale: true,
      autoSyncAllowed: false,
      note:
        "Одинаковая шкала, разный слой: быстрый срез сессии vs ось foundation для Hockey ID.",
    },
    {
      quickField: "discipline",
      structuredPath: "behavioral.discipline",
      sameNumericScale: true,
      autoSyncAllowed: false,
      note:
        "В structured также есть tactical.discipline — иное измерение; behavioral.discipline — поведенческий срез в foundation.",
    },
    {
      quickField: "effort",
      structuredPath: "(нет прямого аналога в integration slice)",
      sameNumericScale: true,
      autoSyncAllowed: false,
      note:
        "Старание остаётся в quick evaluation до появления явной оси в structured продукте.",
    },
  ];
}

/**
 * Неавторитетные подсказки для бакета `behavioral` structured metrics.
 * Использование: prefill в UI, предложение после voice review, **только** с явным подтверждением — не как фоновая синхронизация.
 */
export function quickEvaluationToStructuredBehavioralHints(input: {
  focus?: number | null;
  discipline?: number | null;
}): { behavioral: { focus?: number; discipline?: number } } | null {
  const behavioral: { focus?: number; discipline?: number } = {};
  if (
    input.focus != null &&
    Number.isInteger(input.focus) &&
    input.focus >= 1 &&
    input.focus <= 5
  ) {
    behavioral.focus = input.focus;
  }
  if (
    input.discipline != null &&
    Number.isInteger(input.discipline) &&
    input.discipline >= 1 &&
    input.discipline <= 5
  ) {
    behavioral.discipline = input.discipline;
  }
  return Object.keys(behavioral).length > 0 ? { behavioral } : null;
}

/** Подсчёт заполненных ключей в осях structured (для бейджей / summary UI, без интерпретации значений). */
export function countFilledStructuredAxisKeys(row: {
  iceTechnical?: unknown;
  tactical?: unknown;
  ofpQualitative?: unknown;
  behavioral?: unknown;
  physical?: unknown;
}): number {
  let n = 0;
  for (const bucket of [
    row.iceTechnical,
    row.tactical,
    row.ofpQualitative,
    row.behavioral,
    row.physical,
  ]) {
    if (
      bucket !== null &&
      bucket !== undefined &&
      typeof bucket === "object" &&
      !Array.isArray(bucket)
    ) {
      n += Object.keys(bucket as object).length;
    }
  }
  return n;
}

import type {
  EvaluationSummary,
  LatestSessionEvaluation,
  LatestSessionReport,
} from "@/services/playerService";

export type ArenaMetricTrend = "up" | "down" | "steady" | "neutral";

export type ArenaDataLevel = "rich" | "sparse" | "empty";

export interface ArenaHomeMetric {
  id: "focus" | "discipline" | "effort";
  label: string;
  valueLabel: string;
  trend: ArenaMetricTrend;
}

export interface ArenaHomeBarPoint {
  key: string;
  label: string;
  /** 0..1 */
  fill: number;
}

export interface ArenaHomePreviewModel {
  insightLine: string;
  statusChip: "ai" | "fresh" | "neutral";
  statusChipLabel: string;
  metrics: ArenaHomeMetric[];
  lastSessionBars: ArenaHomeBarPoint[] | null;
  averageHeights: number[] | null;
  /** Амплитуды 0..1 для ECG-пульса развития */
  pulseSamples: number[];
  /** Позиция точки «сейчас» вдоль кривой, 0..1 */
  pulseDotT: number;
  secondaryLine: string | null;
  dataLevel: ArenaDataLevel;
}

/** Микро-состояние для подписи вокруг пульса (без изменений SVG). */
export interface PulseMomentPresentation {
  statusLabel: string;
  mark: string;
  footnote: string;
  /** Одна строка «что это значит» — без цифр, из метрик + статуса */
  interpretationLine: string;
}

function parseMetricScoreLabel(valueLabel: string): number | null {
  const m = valueLabel.trim().match(/^(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function metricById(
  metrics: ArenaHomeMetric[],
  id: ArenaHomeMetric["id"]
): ArenaHomeMetric | undefined {
  return metrics.find((x) => x.id === id);
}

function pulseInterpretationLine(
  model: ArenaHomePreviewModel,
  core: { statusLabel: string }
): string {
  if (model.dataLevel === "empty") {
    return "Ориентиры появятся после оценок тренера";
  }

  const focusM = metricById(model.metrics, "focus");
  const discM = metricById(model.metrics, "discipline");
  const effortM = metricById(model.metrics, "effort");
  const f = focusM ? parseMetricScoreLabel(focusM.valueLabel) : null;
  const d = discM ? parseMetricScoreLabel(discM.valueLabel) : null;
  const e = effortM ? parseMetricScoreLabel(effortM.valueLabel) : null;

  const effortLow =
    effortM?.trend === "down" || (e !== null && e < 3.25);
  const discLow =
    discM?.trend === "down" || (d !== null && d < 3.25);
  const focusLow =
    focusM?.trend === "down" || (f !== null && f < 3.25);

  if (effortLow) return "Стоит усилить вовлечённость";
  if (discLow) return "Нужно усилить внимание к дисциплине";
  if (focusLow) return "Стоит поработать над фокусом";

  const ups = model.metrics.filter((x) => x.trend === "up").length;
  if (core.statusLabel === "Восстановление") {
    return "Форма восстанавливается";
  }
  if (core.statusLabel === "Рост" || ups >= 2) {
    return "Наблюдается уверенный рост";
  }
  if (ups === 1) {
    return "Наблюдается рост";
  }

  const strongFocusDiscipline =
    f !== null &&
    d !== null &&
    f >= 4 &&
    d >= 4 &&
    (e === null || e >= 3.75) &&
    focusM?.trend !== "down" &&
    discM?.trend !== "down";

  if (strongFocusDiscipline) {
    return "Готов к следующему шагу";
  }

  if (model.dataLevel === "rich") {
    return "Сохраняйте стабильный ритм";
  }
  return "Продолжайте накапливать оценки";
}

function momentFromMetrics(
  metrics: ArenaHomeMetric[]
): { statusLabel: string; mark: string } | null {
  const ts = metrics.map((m) => m.trend);
  if (ts.every((t) => t === "neutral")) return null;
  const up = ts.filter((t) => t === "up").length;
  const down = ts.filter((t) => t === "down").length;
  const steady = ts.filter((t) => t === "steady").length;
  if (up > down && up >= 1) return { statusLabel: "Рост", mark: "▲" };
  if (down > up && down >= 1) return { statusLabel: "Снижение", mark: "▼" };
  if (steady >= 2 || (steady >= 1 && up === 0 && down === 0)) {
    return { statusLabel: "Стабильно", mark: "•" };
  }
  if (up > 0) return { statusLabel: "Рост", mark: "▲" };
  if (down > 0) return { statusLabel: "Снижение", mark: "▼" };
  return { statusLabel: "Стабильно", mark: "•" };
}

function avgSlice(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Примитивная траектория по точкам пульса, если метрики ещё нейтральны. */
function momentFromSamples(samples: number[]): { statusLabel: string; mark: string } {
  if (samples.length < 8) {
    return { statusLabel: "Стабильно", mark: "•" };
  }
  const n = samples.length;
  const head = samples.slice(0, 4);
  const mid = samples.slice(Math.floor(n * 0.35), Math.floor(n * 0.55) + 1);
  const tail = samples.slice(-4);
  const aHead = avgSlice(head);
  const aMid = avgSlice(mid);
  const aTail = avgSlice(tail);
  if (aMid < aHead - 0.035 && aTail > aMid + 0.04) {
    return { statusLabel: "Восстановление", mark: "▲" };
  }
  const d = aTail - aHead;
  if (d > 0.05) return { statusLabel: "Рост", mark: "▲" };
  if (d < -0.05) return { statusLabel: "Снижение", mark: "▼" };
  return { statusLabel: "Стабильно", mark: "•" };
}

function pulseFootnoteForModel(m: ArenaHomePreviewModel): string {
  if (m.dataLevel === "empty") {
    return "Кривая обновится после тренировок";
  }
  if (m.dataLevel === "sparse") {
    return "Динамика уточняется по мере оценок";
  }
  return "По последним оценкам тренера";
}

export function getPulseMomentPresentation(
  model: ArenaHomePreviewModel
): PulseMomentPresentation {
  const fromM = momentFromMetrics(model.metrics);
  const core = fromM ?? momentFromSamples(model.pulseSamples);
  return {
    ...core,
    footnote: pulseFootnoteForModel(model),
    interpretationLine: pulseInterpretationLine(model, core),
  };
}

const FALLBACK_INSIGHT_EMPTY =
  "Данные по развитию накапливаются после тренировок — здесь появятся AI-наблюдения и динамика.";
const FALLBACK_INSIGHT_SPARSE =
  "Пока мало оценок: после следующих тренировок картина станет точнее.";

function clampInsight(s: string, max = 132): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function trend(
  last: number | undefined,
  avg: number | null | undefined
): ArenaMetricTrend {
  if (last == null || avg == null || Number.isNaN(avg)) return "neutral";
  if (last > avg + 0.3) return "up";
  if (last < avg - 0.3) return "down";
  return "steady";
}

function fmtScore(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  const x = Math.round(n * 10) / 10;
  return `${x}/5`;
}

function normFive(n: number | undefined | null): number {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n / 5));
}

function clampPulse01(v: number): number {
  return Math.min(1, Math.max(0.06, v));
}

/** Развёртка «пульса»: интерполяция оценок последней сессии и средних в волновой ряд. */
export function computePulseSeries(
  lastSessionBars: ArenaHomeBarPoint[] | null,
  averageHeights: number[] | null
): { pulseSamples: number[]; pulseDotT: number } {
  const seeds: number[] = [];
  if (lastSessionBars?.length) {
    lastSessionBars.forEach((b) => seeds.push(Math.min(1, Math.max(0, b.fill))));
  }
  if (averageHeights?.length) {
    averageHeights.forEach((h) => seeds.push(Math.min(1, Math.max(0, h))));
  }

  const targetLen = 22;
  const out: number[] = [];

  if (seeds.length === 0) {
    for (let i = 0; i < targetLen; i++) {
      const t = i / (targetLen - 1);
      out.push(
        clampPulse01(
          0.5 + 0.09 * Math.sin(t * Math.PI * 6) + 0.045 * Math.cos(t * Math.PI * 13)
        )
      );
    }
    return { pulseSamples: out, pulseDotT: 0.91 };
  }

  for (let i = 0; i < targetLen; i++) {
    const f = (i / (targetLen - 1)) * (seeds.length - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(i0 + 1, seeds.length - 1);
    const t = f - i0;
    let v = seeds[i0] * (1 - t) + seeds[i1] * t;
    v += 0.038 * Math.sin((i / targetLen) * Math.PI * 9);
    out.push(clampPulse01(v));
  }
  return { pulseSamples: out, pulseDotT: 0.9 };
}

function pickInsightFromEval(
  latest: LatestSessionEvaluation | null,
  summary: EvaluationSummary,
  report: LatestSessionReport | null
): string {
  if (report?.summary?.trim()) {
    return clampInsight(report.summary.trim());
  }
  const hasLatest =
    latest &&
    (latest.focus != null || latest.discipline != null || latest.effort != null);
  if (!hasLatest && summary.totalEvaluations < 1) return "";

  const parts: string[] = [];
  if (latest?.focus != null && summary.avgFocus != null) {
    const tr = trend(latest.focus, summary.avgFocus);
    if (tr === "up") parts.push("фокус растёт относительно среднего");
    else if (tr === "down") parts.push("фокус чуть ниже привычного уровня");
  }
  if (latest?.discipline != null && summary.avgDiscipline != null) {
    const tr = trend(latest.discipline, summary.avgDiscipline);
    if (tr === "up") parts.push("дисциплина на тренировке выше среднего");
  }
  if (latest?.effort != null && summary.avgEffort != null) {
    const tr = trend(latest.effort, summary.avgEffort);
    if (tr === "up") parts.push("вовлечённость сильная");
    else if (tr === "steady" && latest.effort >= 4) parts.push("стабильная вовлечённость");
  }

  if (parts.length > 0) {
    const head = parts[0];
    return clampInsight(head.charAt(0).toUpperCase() + head.slice(1) + ".");
  }

  if (summary.totalEvaluations > 0) {
    const highs: string[] = [];
    if ((summary.avgFocus ?? 0) >= 4) highs.push("фокус");
    if ((summary.avgDiscipline ?? 0) >= 4) highs.push("дисциплина");
    if ((summary.avgEffort ?? 0) >= 4) highs.push("вовлечённость");
    if (highs.length > 0) {
      return clampInsight(
        `По последним тренировкам заметны сильные ${highs.slice(0, 2).join(" и ")}.`
      );
    }
    return clampInsight(
      "Оценки тренера фиксируются — динамика станет заметна после нескольких тренировок подряд."
    );
  }

  return "";
}

export function buildArenaHomePreview(
  signals:
    | {
        latestSessionEvaluation: LatestSessionEvaluation | null;
        evaluationSummary: EvaluationSummary;
        latestSessionReport: LatestSessionReport | null;
      }
    | null,
  coachSummarySnippet: string | undefined
): ArenaHomePreviewModel {
  const idlePulse = computePulseSeries(null, null);
  const empty: ArenaHomePreviewModel = {
    insightLine: "",
    statusChip: "neutral",
    statusChipLabel: "Hockey ID AI",
    metrics: [
      {
        id: "focus",
        label: "Фокус",
        valueLabel: "—",
        trend: "neutral",
      },
      {
        id: "discipline",
        label: "Дисциплина",
        valueLabel: "—",
        trend: "neutral",
      },
      {
        id: "effort",
        label: "Вовлечённость",
        valueLabel: "—",
        trend: "neutral",
      },
    ],
    lastSessionBars: null,
    averageHeights: null,
    pulseSamples: idlePulse.pulseSamples,
    pulseDotT: idlePulse.pulseDotT,
    secondaryLine: null,
    dataLevel: "empty",
  };

  if (!signals) {
    const co = coachSummarySnippet?.trim();
    return {
      ...empty,
      insightLine: co ? clampInsight(co) : FALLBACK_INSIGHT_EMPTY,
      statusChip: co ? "fresh" : "neutral",
      statusChipLabel: co ? "Обновлено недавно" : "Hockey ID AI",
    };
  }

  const { latestSessionEvaluation: latest, evaluationSummary: summary, latestSessionReport: report } =
    signals;

  const hasAnyNumber =
    latest?.focus != null ||
    latest?.discipline != null ||
    latest?.effort != null ||
    summary.avgFocus != null ||
    summary.avgDiscipline != null ||
    summary.avgEffort != null;

  const metrics: ArenaHomeMetric[] = [
    {
      id: "focus",
      label: "Фокус",
      valueLabel: fmtScore(latest?.focus ?? summary.avgFocus ?? null),
      trend: trend(latest?.focus, summary.avgFocus),
    },
    {
      id: "discipline",
      label: "Дисциплина",
      valueLabel: fmtScore(latest?.discipline ?? summary.avgDiscipline ?? null),
      trend: trend(latest?.discipline, summary.avgDiscipline),
    },
    {
      id: "effort",
      label: "Вовлечённость",
      valueLabel: fmtScore(latest?.effort ?? summary.avgEffort ?? null),
      trend: trend(latest?.effort, summary.avgEffort),
    },
  ];

  let lastSessionBars: ArenaHomeBarPoint[] | null = null;
  if (latest && (latest.focus != null || latest.discipline != null || latest.effort != null)) {
    lastSessionBars = [
      { key: "e", label: "В", fill: normFive(latest.effort ?? null) },
      { key: "f", label: "Ф", fill: normFive(latest.focus ?? null) },
      { key: "d", label: "Д", fill: normFive(latest.discipline ?? null) },
    ];
  }

  let averageHeights: number[] | null = null;
  if (summary.avgEffort != null || summary.avgFocus != null || summary.avgDiscipline != null) {
    averageHeights = [
      normFive(summary.avgEffort),
      normFive(summary.avgFocus),
      normFive(summary.avgDiscipline),
    ];
  }

  let insight = pickInsightFromEval(latest, summary, report);
  if (!insight && coachSummarySnippet?.trim()) {
    insight = clampInsight(coachSummarySnippet.trim());
  }
  if (!insight && hasAnyNumber) {
    insight = FALLBACK_INSIGHT_SPARSE;
  }
  if (!insight) {
    insight = FALLBACK_INSIGHT_EMPTY;
  }

  const secondaryLine =
    summary.totalEvaluations > 0
      ? (() => {
          const n = summary.totalEvaluations;
          const m10 = n % 10;
          const m100 = n % 100;
          const tail =
            m10 === 1 && m100 !== 11
              ? "оценка"
              : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)
                ? "оценки"
                : "оценок";
          return `Данные: ${n} ${tail} тренера`;
        })()
      : null;

  let dataLevel: ArenaDataLevel = "empty";
  if (summary.totalEvaluations >= 3 && hasAnyNumber) dataLevel = "rich";
  else if (hasAnyNumber || summary.totalEvaluations > 0) dataLevel = "sparse";
  else dataLevel = "empty";

  const hasFreshSignal =
    Boolean(report?.updatedAt?.trim()) ||
    Boolean(
      latest &&
        (latest.focus != null || latest.discipline != null || latest.effort != null)
    );
  const statusChip: "ai" | "fresh" | "neutral" = hasFreshSignal
    ? "fresh"
    : dataLevel === "rich"
      ? "ai"
      : "neutral";
  const statusChipLabel =
    statusChip === "fresh" ? "Обновлено недавно" : "Hockey ID AI";

  const { pulseSamples, pulseDotT } = computePulseSeries(lastSessionBars, averageHeights);

  return {
    insightLine: insight,
    statusChip,
    statusChipLabel,
    metrics,
    lastSessionBars,
    averageHeights,
    pulseSamples,
    pulseDotT,
    secondaryLine,
    dataLevel,
  };
}

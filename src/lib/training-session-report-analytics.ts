/**
 * Эвристическая аналитика по истории канонических `TrainingSessionReport` для одного игрока.
 * Вход: строки истории с полным текстом полей (`PublishedTrainingSessionReportHistoryAnalyticsRow`).
 * Без ML, без черновиков / Arena / live-training структур.
 */

import type { PublishedTrainingSessionReportHistoryAnalyticsRow } from "./training-session-published-report-history";

/** Вход аналитики: элемент истории `PublishedTrainingSessionReportHistoryItemDto` + полные тексты полей отчёта. */
export type TrainingSessionReportAnalyticsInput =
  PublishedTrainingSessionReportHistoryAnalyticsRow;

export type CoachTrainingSessionReportThemeItem = {
  label: string;
  sessionsCount: number;
};

export type CoachTrainingSessionReportRecentTrend = {
  kind: "improving" | "stable" | "mixed";
  summaryLine: string;
  basedOnSessions: number;
};

export type CoachTrainingSessionReportAttentionItem = {
  label: string;
  sessionsCount: number;
  hint: string;
};

export type CoachTrainingSessionReportAnalyticsDto = {
  /** Число отчётов в выборке (для слоя действий и пояснений). */
  reportCount: number;
  dataSufficiency: "none" | "low" | "moderate" | "rich";
  recurringFocusThemes: CoachTrainingSessionReportThemeItem[];
  recentTrend: CoachTrainingSessionReportRecentTrend;
  attentionSignals: CoachTrainingSessionReportAttentionItem[];
  /** Отчёт командный; плотность упоминаний игрока в тексте не выводим. */
  playerHighlightDensity: null;
  caveats: string[];
};

const ISSUE_SUBSTRINGS_RU = [
  "внимани",
  "слаб",
  "ошибк",
  "заминк",
  "медлен",
  "пассив",
  "неточн",
  "проблем",
  "нужно дораб",
  "надо подт",
  "не успев",
  "недостат",
] as const;

const POSITIVE_SUBSTRINGS_RU = [
  "хорош",
  "отличн",
  "стабильн",
  "уверен",
  "сильн",
  "прогресс",
  "активн",
  "растёт",
  "растет",
  "аккуратн",
] as const;

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .replace(/^[•\-\u2013\u2014\d.)]+\s*/u, "")
    .slice(0, 120);
}

function displayLabelForKey(key: string, firstSeen: string): string {
  const d = firstSeen.trim();
  if (d.length > 0 && d.length <= 140) return d;
  return key.slice(0, 140);
}

/** Разбивка многострочного поля на отдельные мысли. */
function splitIntoSegments(text: string | null, maxSegments: number): string[] {
  if (!text?.trim()) return [];
  const raw = text
    .split(/\r?\n|;(?=\s)/u)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/u))
    .map((x) => x.trim())
    .filter((x) => x.length >= 4);
  return raw.slice(0, maxSegments);
}

function countSubstrings(haystack: string, needles: readonly string[]): number {
  const h = haystack.toLowerCase();
  let n = 0;
  for (const needle of needles) {
    let i = 0;
    while (true) {
      const j = h.indexOf(needle, i);
      if (j < 0) break;
      n += 1;
      i = j + needle.length;
    }
  }
  return n;
}

function combinedReportText(row: TrainingSessionReportAnalyticsInput): string {
  return [
    row.focusAreasFull ?? "",
    row.summaryFull ?? "",
    row.coachNoteFull ?? "",
    row.parentMessageFull ?? "",
  ].join("\n");
}

function toneBalanceForText(text: string): number {
  const p = countSubstrings(text, POSITIVE_SUBSTRINGS_RU);
  const i = countSubstrings(text, ISSUE_SUBSTRINGS_RU);
  return p - i;
}

type SortedRow = TrainingSessionReportAnalyticsInput & {
  _start: number;
};

function parseStartMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function dataSufficiencyFromCount(n: number): CoachTrainingSessionReportAnalyticsDto["dataSufficiency"] {
  if (n <= 0) return "none";
  if (n <= 2) return "low";
  if (n <= 6) return "moderate";
  return "rich";
}

/**
 * Строит аналитику по списку строк истории (новые сверху в DTO — здесь сортируем по времени).
 * Полные тексты обязательны для тем; превью из DTO не используются.
 */
export function computeTrainingSessionReportAnalytics(
  rows: TrainingSessionReportAnalyticsInput[]
): CoachTrainingSessionReportAnalyticsDto {
  const caveats: string[] = [];

  if (!rows.length) {
    return {
      reportCount: 0,
      dataSufficiency: "none",
      recurringFocusThemes: [],
      recentTrend: {
        kind: "mixed",
        summaryLine: "Пока нет сохранённых отчётов по тренировкам с явкой этого игрока.",
        basedOnSessions: 0,
      },
      attentionSignals: [],
      playerHighlightDensity: null,
      caveats: [
        "Аналитика опирается только на поля отчёта по тренировке (сводка, фокусы, заметка, сообщение родителям).",
      ],
    };
  }

  const chronological: SortedRow[] = [...rows]
    .map((r) => ({ ...r, _start: parseStartMs(r.sessionStartedAt) }))
    .sort((a, b) => a._start - b._start);

  const n = chronological.length;
  if (n <= 2) {
    caveats.push("Мало точек — выводы ориентировочные.");
  }

  // --- recurringFocusThemes: из focus в приоритете, плюс умеренно из summary
  const themeKeyToData = new Map<
    string,
    { sessions: Set<string>; display: string }
  >();

  for (const row of chronological) {
    const tid = row.trainingId;
    const focusSegs = splitIntoSegments(row.focusAreasFull, 12);
    const sumSegs = splitIntoSegments(row.summaryFull, 4);
    const keysThisSession = new Set<string>();
    const keyToSeg = new Map<string, string>();

    for (const seg of focusSegs) {
      const key = normKey(seg);
      if (key.length < 6) continue;
      keysThisSession.add(key);
      if (!keyToSeg.has(key)) keyToSeg.set(key, seg);
    }
    for (const seg of sumSegs) {
      const key = normKey(seg);
      if (key.length < 6) continue;
      keysThisSession.add(key);
      if (!keyToSeg.has(key)) keyToSeg.set(key, seg);
    }

    for (const key of keysThisSession) {
      const seg = keyToSeg.get(key) ?? key;
      let cur = themeKeyToData.get(key);
      if (!cur) {
        cur = { sessions: new Set(), display: displayLabelForKey(key, seg) };
        themeKeyToData.set(key, cur);
      }
      cur.sessions.add(tid);
    }
  }

  const minThemeSessions = n >= 4 ? 2 : 1;
  const recurringFocusThemes: CoachTrainingSessionReportThemeItem[] = Array.from(
    themeKeyToData.entries()
  )
    .map(([, v]) => ({
      label: v.display,
      sessionsCount: v.sessions.size,
    }))
    .filter((x) => x.sessionsCount >= minThemeSessions && x.label.length > 0)
    .sort((a, b) => b.sessionsCount - a.sessionsCount || b.label.length - a.label.length)
    .slice(0, 5);

  // --- attentionSignals: повтор в ≥2 отчётах, приоритет focus+coachNote
  const attentionMap = new Map<string, { sessions: Set<string>; display: string }>();
  for (const row of chronological) {
    const tid = row.trainingId;
    const segs = [
      ...splitIntoSegments(row.focusAreasFull, 14),
      ...splitIntoSegments(row.coachNoteFull, 6),
    ];
    const seen = new Set<string>();
    for (const seg of segs) {
      const key = normKey(seg);
      if (key.length < 8) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      let cur = attentionMap.get(key);
      if (!cur) {
        cur = { sessions: new Set(), display: displayLabelForKey(key, seg) };
        attentionMap.set(key, cur);
      }
      cur.sessions.add(tid);
    }
  }

  const attentionSignals: CoachTrainingSessionReportAttentionItem[] = Array.from(
    attentionMap.entries()
  )
    .filter(([, v]) => v.sessions.size >= 2)
    .map(([, v]) => ({
      label: v.display,
      sessionsCount: v.sessions.size,
      hint: "Встречается в нескольких отчётах — имеет смысл отслеживать отдельно.",
    }))
    .sort((a, b) => b.sessionsCount - a.sessionsCount)
    .slice(0, 5);

  // --- recentTrend: последние k vs предыдущие k по toneBalance
  const k = Math.min(5, Math.max(3, Math.ceil(n / 2)));
  const balances = chronological.map((r) => toneBalanceForText(combinedReportText(r)));

  let kind: CoachTrainingSessionReportRecentTrend["kind"] = "mixed";
  let summaryLine =
    "По ключевым словам в текстах отчётов динамика неоднозначная — смотрите формулировки ниже.";
  let basedOnSessions = Math.min(k, n);

  if (n < 4) {
    kind = "mixed";
    summaryLine =
      "Для устойчивой оценки динамики нужно больше отчётов (от четырёх и больше). Сейчас — лишь общее впечатление по формулировкам.";
    basedOnSessions = n;
  } else {
    const recent = balances.slice(-k);
    const prevStart = Math.max(0, balances.length - 2 * k);
    const prev = balances.slice(prevStart, -k);
    const recentAvg =
      recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length);
    const prevAvg = prev.length
      ? prev.reduce((a, b) => a + b, 0) / prev.length
      : recentAvg;

    const diff = recentAvg - prevAvg;
    const spreadRecent =
      recent.length > 1
        ? Math.max(...recent) - Math.min(...recent)
        : 0;

    if (spreadRecent >= 4 && recent.length >= 3) {
      kind = "mixed";
      summaryLine =
        "В последних отчётах заметен разброс формулировок — динамику лучше оценивать по конкретным темам выше.";
    } else if (diff >= 1.2) {
      kind = "improving";
      summaryLine =
        "В последних отчётах чаще встречаются позитивные формулировки относительно предыдущего отрезка (эвристика по тексту, не оценка навыка).";
    } else if (diff <= -1.2) {
      kind = "mixed";
      summaryLine =
        "В последних отчётах больше формулировок про зоны внимания, чем раньше — имеет смысл пройтись по отчётам по датам.";
    } else {
      kind = "stable";
      summaryLine =
        "Тон формулировок в последних отчётах близок к предыдущему отрезку — явного сдвига по ключевым словам не видно.";
    }
  }

  return {
    reportCount: n,
    dataSufficiency: dataSufficiencyFromCount(n),
    recurringFocusThemes,
    recentTrend: { kind, summaryLine, basedOnSessions },
    attentionSignals,
    playerHighlightDensity: null,
    caveats: [
      "Оценки приблизительные: зависят от того, как тренер формулирует отчёты.",
      "Отчёт относится к командной тренировке; это не персональная медицинская или психологическая оценка.",
      ...caveats,
    ],
  };
}

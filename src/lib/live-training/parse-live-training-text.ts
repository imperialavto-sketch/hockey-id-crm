/**
 * Rule-based разбор текста наблюдения живой тренировки (без LLM).
 * Работает после normalize; roster — команда сессии.
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";
import type { LiveTrainingRosterPlayer } from "./match-player";
import { rosterPlayersMatchingSpokenToken } from "./roster-spoken-name";

export type LiveTrainingParsedObservation = {
  normalizedText: string;
  extractedPlayerNameRaw: string | null;
  inferredCategory: string | null;
  inferredSentiment: LiveTrainingObservationSentiment | null;
  parserSignals: string[];
  confidence: number | null;
};

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function normLower(s: string): string {
  return collapse(s).toLowerCase();
}

function fullName(p: LiveTrainingRosterPlayer): string {
  return collapse(`${p.firstName} ${p.lastName}`);
}

/** Первый токен в начале строки (кириллица/латиница/дефис). */
function firstWord(text: string): string | null {
  const m = collapse(text).match(/^([\p{L}][\p{L}\-]*)/u);
  return m?.[1] ?? null;
}

function rosterByFullPrefix(roster: LiveTrainingRosterPlayer[], prefix: string): LiveTrainingRosterPlayer[] {
  const q = normLower(prefix);
  return roster.filter((p) => normLower(fullName(p)) === q);
}

/**
 * Выделяет имя в начале фразы, только если однозначно сопоставляется с ростером.
 */
export function extractRosterPlayerNamePrefix(
  normalizedText: string,
  roster: LiveTrainingRosterPlayer[]
): { nameRaw: string | null; signals: string[] } {
  const signals: string[] = [];
  const text = collapse(normalizedText);
  if (!text || roster.length === 0) {
    return { nameRaw: null, signals: ["name:skip_empty"] };
  }

  const commaIdx = text.indexOf(",");
  if (commaIdx !== -1) {
    const prefix = collapse(text.slice(0, commaIdx));
    if (prefix) {
      const byFull = rosterByFullPrefix(roster, prefix);
      if (byFull.length === 1) {
        signals.push("name:comma_prefix_fullname");
        return { nameRaw: prefix, signals };
      }
      if (byFull.length > 1) {
        signals.push("name:ambiguous_fullname");
        return { nameRaw: null, signals };
      }
      const first = firstWord(prefix) ?? prefix.split(/\s+/)[0] ?? "";
      if (first) {
        const spoken = rosterPlayersMatchingSpokenToken(roster, first);
        if (spoken.length === 1) {
          signals.push(
            normLower(first) === normLower(spoken[0]!.firstName)
              ? "name:comma_prefix_firstname"
              : "name:comma_prefix_diminutive"
          );
          return { nameRaw: first, signals };
        }
        if (spoken.length > 1) {
          signals.push("name:ambiguous_spoken_token");
          return { nameRaw: null, signals };
        }
      }
    }
    signals.push("name:comma_no_roster_match");
    return { nameRaw: null, signals };
  }

  const w = firstWord(text);
  if (!w) {
    signals.push("name:no_token");
    return { nameRaw: null, signals };
  }

  const spoken = rosterPlayersMatchingSpokenToken(roster, w);
  if (spoken.length === 1) {
    signals.push(
      normLower(w) === normLower(spoken[0]!.firstName)
        ? "name:leading_firstname"
        : "name:leading_diminutive"
    );
    return { nameRaw: w, signals };
  }
  if (spoken.length > 1) {
    signals.push("name:ambiguous_spoken_token");
    return { nameRaw: null, signals };
  }

  const two = text.match(/^([\p{L}][\p{L}\-]*)\s+([\p{L}][\p{L}\-]*)/u);
  if (two) {
    const pair = `${two[1]} ${two[2]}`;
    const byFull2 = rosterByFullPrefix(roster, pair);
    if (byFull2.length === 1) {
      signals.push("name:leading_fullname_two_words");
      return { nameRaw: pair, signals };
    }
  }

  signals.push("name:no_roster_match");
  return { nameRaw: null, signals };
}

type CategoryRule = { id: string; test: (lower: string) => boolean };

/** Подстроки в нижнем регистре (\b в JS не работает с кириллицей). */
function hasAny(l: string, needles: string[]): boolean {
  return needles.some((n) => l.includes(n));
}

/**
 * Порядок = приоритет: первое совпадение выигрывает (узкие темы выше общих похвал).
 */
const CATEGORY_RULES: CategoryRule[] = [
  {
    id: "discipline",
    test: (l) => hasAny(l, ["не болтай", "дисциплин", "соберись", "тише"]),
  },
  {
    id: "effort",
    test: (l) =>
      hasAny(l, ["ленишься", "не ленись", "не добежал", "не дорабатываешь", "лень"]),
  },
  {
    id: "attention",
    test: (l) => hasAny(l, ["внимательн", "слушай", "не услышал", "задание", "задания"]),
  },
  {
    id: "shooting",
    test: (l) => hasAny(l, ["бросок", "броск", "кисть", "щелчок", "щёлчок"]),
  },
  {
    id: "skating",
    test: (l) => hasAny(l, ["катани", "дуга", "дуги", "ребр", "шаг"]),
  },
  {
    id: "puck_control",
    test: (l) => hasAny(l, ["клюшк", "ведени", "контроль шайб", "контроля шайб"]),
  },
  {
    id: "pace",
    test: (l) => hasAny(l, ["темп", "скорост", "ускорени", "потерял темп"]),
  },
  {
    id: "ofp_technique",
    test: (l) => hasAny(l, ["присед", "выпад", "корпус", "спина", "спине", "ноги"]),
  },
  {
    id: "correction",
    test: (l) => hasAny(l, ["ниже", "глубже", "исправь", "не так", "держи", "исправляй"]),
  },
  {
    id: "praise",
    test: (l) =>
      hasAny(l, [
        "молодец",
        "молодцы",
        "отличн",
        "супер",
        "классно",
        "здорово",
        "умница",
        "хорошо работаешь",
        "хорошо работает",
        "хорошо работаем",
      ]),
  },
];

const POSITIVE_HINT = (l: string) =>
  hasAny(l, ["молодец", "молодцы", "отличн", "супер", "классно", "здорово", "умница", "хорошо"]);

/** Негатив: фразы и слова, не одно «не» без контекста. */
const NEGATIVE_HINT = (l: string) =>
  hasAny(l, [
    "плохо",
    "ошибк",
    "ленишься",
    "ленись",
    "невнимательн",
    "потерял",
    "теряешь",
    "не ленись",
    "не добежал",
    "не дорабатываешь",
    "не так",
  ]);

export function inferCategoryFromLiveTrainingText(normalizedText: string): {
  category: string;
  signals: string[];
} {
  const lower = normLower(normalizedText);
  for (const rule of CATEGORY_RULES) {
    if (rule.test(lower)) {
      return { category: rule.id, signals: [`category:${rule.id}`] };
    }
  }
  return { category: "general_observation", signals: ["category:general_observation_fallback"] };
}

export function inferSentimentFromLiveTrainingText(normalizedText: string): {
  sentiment: LiveTrainingObservationSentiment | null;
  signals: string[];
} {
  const lower = normLower(normalizedText);
  const pos = POSITIVE_HINT(lower);
  const neg = NEGATIVE_HINT(lower);
  if (pos && neg) {
    return { sentiment: null, signals: ["sentiment:conflict_neutral"] };
  }
  if (pos) {
    return { sentiment: "positive", signals: ["sentiment:positive"] };
  }
  if (neg) {
    return { sentiment: "negative", signals: ["sentiment:negative"] };
  }
  return { sentiment: null, signals: ["sentiment:none"] };
}

function computeParserConfidence(params: {
  hasName: boolean;
  categoryIsGeneral: boolean;
  hasSentiment: boolean;
}): number {
  let score = 0.25;
  if (params.hasName) score += 0.3;
  if (!params.categoryIsGeneral) score += 0.2;
  if (params.hasSentiment) score += 0.15;
  return Math.min(0.9, Math.round(score * 100) / 100);
}

/**
 * Полный разбор: имя из ростера, категория, тональность, сигналы и грубая уверенность.
 */
export function parseLiveTrainingObservationText(
  normalizedText: string,
  roster: LiveTrainingRosterPlayer[]
): LiveTrainingParsedObservation {
  const normalized = collapse(normalizedText);
  const signals: string[] = [];

  const { nameRaw, signals: nameSignals } = extractRosterPlayerNamePrefix(normalized, roster);
  signals.push(...nameSignals);

  const { category, signals: catSignals } = inferCategoryFromLiveTrainingText(normalized);
  signals.push(...catSignals);

  const { sentiment, signals: sentSignals } = inferSentimentFromLiveTrainingText(normalized);
  signals.push(...sentSignals);

  const confidence = computeParserConfidence({
    hasName: Boolean(nameRaw),
    categoryIsGeneral: category === "general_observation",
    hasSentiment: sentiment != null,
  });
  signals.push(`confidence:${confidence}`);

  return {
    normalizedText: normalized,
    extractedPlayerNameRaw: nameRaw,
    inferredCategory: category,
    inferredSentiment: sentiment,
    parserSignals: signals,
    confidence,
  };
}

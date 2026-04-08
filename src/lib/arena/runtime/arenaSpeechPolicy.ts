/**
 * Минимальная детерминированная гигиена текста для live-захвата Arena.
 *
 * Это не полноценная семантическая модерация, не AI и не продуктовая интерпретация —
 * только безопасный базовый фильтр до персистенции события.
 */

import { normalizeArenaPlayerSpeechText } from "./arenaPlayerResolver";

export type ArenaSpeechPolicyHit = {
  code: "prohibited" | "junk" | "empty_after_normalize";
  detail?: string;
};

export type ArenaSpeechPolicyResult =
  | { ok: true }
  | { ok: false; hit: ArenaSpeechPolicyHit };

/** Грубая лексика (латиница + кириллица): только детерминированные подстроки/префиксы, без NLP. */
const PROFANITY_TOKENS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "piss",
  "slut",
  "whore",
  "nazi",
  "хуй",
  "пизд",
  "ебан",
  "ебат",
  "ебал",
  "ебло",
  "мудак",
  "мудил",
  "бляд",
  "сука",
  "гандон",
] as const;

/** Очевидный мусор / плейсхолдеры (строгое совпадение фразы в нормализованной строке). */
const JUNK_SUBSTRINGS = [
  "asdfasdf",
  "qwertyqwerty",
  "lorem ipsum",
  "блаблабла",
  "тесттесттест",
  "blahblah",
];

function tokenizeForPolicy(norm: string): string[] {
  return norm.split(/\s+/).filter(Boolean);
}

function stripEdgePunctuation(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/giu, "");
}

/**
 * Проверка сырого и нормализованного текста наблюдения.
 * `normalizedLive` — результат {@link normalizeLiveTrainingEventText}.
 */
export function evaluateArenaSpeechPolicy(params: {
  raw: string;
  normalizedLive: string;
}): ArenaSpeechPolicyResult {
  const live = params.normalizedLive.trim();
  if (!live) {
    return { ok: false, hit: { code: "empty_after_normalize" } };
  }

  const arenaNorm = normalizeArenaPlayerSpeechText(live);
  if (!arenaNorm) {
    return { ok: false, hit: { code: "empty_after_normalize" } };
  }

  const lowerLive = live.toLowerCase();
  for (const junk of JUNK_SUBSTRINGS) {
    if (lowerLive.includes(junk)) {
      return { ok: false, hit: { code: "junk", detail: junk } };
    }
  }

  const collapsed = arenaNorm.replace(/\s/g, "");
  if (collapsed.length >= 12 && /^(.)\1+$/.test(collapsed)) {
    return { ok: false, hit: { code: "junk", detail: "repeated_character" } };
  }

  for (const tok of tokenizeForPolicy(arenaNorm)) {
    const core = stripEdgePunctuation(tok).toLowerCase();
    if (core.length < 2) continue;
    for (const bad of PROFANITY_TOKENS) {
      if (bad.length >= 4) {
        if (core.includes(bad)) {
          return { ok: false, hit: { code: "prohibited", detail: bad } };
        }
      } else if (core === bad || (core.length > bad.length && core.startsWith(bad))) {
        return { ok: false, hit: { code: "prohibited", detail: bad } };
      }
    }
  }

  return { ok: true };
}

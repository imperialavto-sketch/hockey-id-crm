/**
 * Arena sentiment V2 — лёгкие эвристики без NLP/GPT.
 * Используется только из parseArenaIntent; контракт ArenaIntent не меняется.
 */

export type ArenaSentiment = "positive" | "neutral" | "negative";

const CONTRAST_BOOST = 2.35;
/** Минимальный перевес, чтобы выбрать тон не neutral */
const EDGE = 0.85;

/** Сильный сигнал «нет» как отдельное слово (не подстрока вроде «интернет») */
const NET_TOKEN_WEIGHT = 2.6;

const POS_STEMS = [
  "хорош",
  "отлич",
  "правильн",
  "сильн",
  "молодц",
  "классн",
  "вперед",
] as const;

const NEG_STEMS = ["плох", "ошиб", "поздн", "потер", "слаб"] as const;

const NEG_PHRASES = [
  "не успел",
  "неуспел",
  "не так",
  "не доработал",
  "не включился",
  "не держит",
  "не закрыл",
  "не закрыт",
  "не дочитал",
] as const;

/** После «не» — не считать как негативный глагольный шаблон */
const NE_EXCLUDE_FOLLOWING = new Set([
  "только",
  "менее",
  "более",
  "смотря",
  "всегда",
  "все",
  "всё",
  "то",
]);

export function normalizeArenaText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeArena(t: string): string[] {
  return t.split(/[^\p{L}\p{N}-]+/u).filter(Boolean);
}

function stemHit(tokens: string[], stems: readonly string[]): number {
  let score = 0;
  for (const stem of stems) {
    for (const tok of tokens) {
      if (tok.length >= stem.length && tok.startsWith(stem)) {
        score += 1;
        break;
      }
    }
  }
  return score;
}

/** Публичный счётчик для отладки / аудита */
export function scorePositiveSignals(normalized: string): number {
  const tokens = tokenizeArena(normalized);
  return stemHit(tokens, POS_STEMS);
}

export function scoreNegativeSignals(normalized: string): number {
  const tokens = tokenizeArena(normalized);
  let n = stemHit(tokens, NEG_STEMS);
  const t = normalized;
  for (const ph of NEG_PHRASES) {
    if (t.includes(ph)) n += 1.2;
  }
  return n;
}

function hasStandaloneNetToken(normalized: string): boolean {
  return tokenizeArena(normalized).some((tok) => tok === "нет");
}

/**
 * «не» + оценочное / позитивное слово → явный минус
 */
function scoreNePlusPolarized(normalized: string): number {
  let bonus = 0;
  const re = /(^|\s)не\s+([а-яё-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const w = m[2];
    if (!w || w.length < 3) continue;
    if (NE_EXCLUDE_FOLLOWING.has(w)) continue;
    for (const stem of POS_STEMS) {
      if (w.startsWith(stem)) {
        bonus += 2.1;
        break;
      }
    }
  }
  return bonus;
}

/**
 * «не» + глагол/длинное слово (осторожно, с exclude)
 */
function scoreNeVerbLike(normalized: string): number {
  let bonus = 0;
  const re = /(^|\s)не\s+([а-яё-]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const w = m[2];
    if (!w || w.length < 4) continue;
    if (NE_EXCLUDE_FOLLOWING.has(w)) continue;
    if (POS_STEMS.some((s) => w.startsWith(s))) continue;
    bonus += 0.95;
  }
  return bonus;
}

function contrastTailSlice(normalized: string): { tail: string } | null {
  const re = /(?:^|[\s,])(но|однако)\s+/i;
  const m = re.exec(normalized);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[0].length;
  const tail = normalized.slice(start).trim();
  if (tail.length < 2) return null;
  return { tail };
}

function decideByScores(pos: number, neg: number): ArenaSentiment {
  if (neg >= pos && neg >= EDGE) return "negative";
  if (pos > neg && pos >= EDGE) return "positive";
  return "neutral";
}

export function detectArenaSentiment(transcript: string): ArenaSentiment {
  const t = normalizeArenaText(transcript);
  if (!t) return "neutral";

  const contrast = contrastTailSlice(t);
  if (contrast) {
    const tailPos = scorePositiveSignals(contrast.tail) * CONTRAST_BOOST;
    const tailNeg = scoreNegativeSignals(contrast.tail) * CONTRAST_BOOST;
    if (tailNeg >= 1 && tailNeg > tailPos) return "negative";
    if (tailPos >= 1 && tailPos > tailNeg) return "positive";
  }

  let pos = scorePositiveSignals(t);
  let neg =
    scoreNegativeSignals(t) +
    scoreNePlusPolarized(t) +
    scoreNeVerbLike(t);

  if (hasStandaloneNetToken(t)) {
    neg += NET_TOKEN_WEIGHT;
  }

  return decideByScores(pos, neg);
}

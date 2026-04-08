/**
 * V3: сбор всех упоминаний игроков и выбор одного primary (контракт ArenaIntent без изменений).
 */

import { normalizeArenaText } from "./arena-sentiment";

export type ArenaPlayerMention = {
  playerId: string;
  index: number;
  matchedText: string;
  matchType: "full_name" | "name_part" | "jersey";
  baseConfidence: number;
};

type RosterPlayer = {
  id: string;
  name: string;
  jerseyNumber?: number;
};

const MATCH_WEIGHT: Record<ArenaPlayerMention["matchType"], number> = {
  full_name: 420,
  name_part: 260,
  jersey: 170,
};

/** Первое «оценочное» слово — бонус, если упоминание целиком до него */
const EVAL_CUE_SUBSTRINGS = [
  "поздно",
  "хорошо",
  "плохо",
  "ошибка",
  "потерял",
  "потеряли",
  "отлично",
  "классно",
  "слаб",
  "молодц",
  "не успел",
  "не так",
] as const;

const BONUS_BEFORE_EVAL = 95;
const PENALTY_AFTER_CONJ_AND = 140;

function isCyrillicLetter(c: string): boolean {
  return /[а-яёa-z]/i.test(c);
}

function findAllSubstringMatches(
  haystack: string,
  needle: string,
  wordBoundary: boolean
): number[] {
  if (needle.length < 2) return [];
  const out: number[] = [];
  let from = 0;
  while (from <= haystack.length) {
    const i = haystack.indexOf(needle, from);
    if (i === -1) break;
    if (wordBoundary) {
      const before = i === 0 ? "" : haystack[i - 1]!;
      const after = i + needle.length >= haystack.length ? "" : haystack[i + needle.length]!;
      if (isCyrillicLetter(before) || isCyrillicLetter(after)) {
        from = i + 1;
        continue;
      }
    }
    out.push(i);
    from = i + 1;
  }
  return out;
}

function firstEvalCueIndex(transcriptLower: string): number {
  let min = Number.POSITIVE_INFINITY;
  for (const cue of EVAL_CUE_SUBSTRINGS) {
    const i = transcriptLower.indexOf(cue);
    if (i !== -1 && i < min) min = i;
  }
  return Number.isFinite(min) ? min : transcriptLower.length;
}

function isAfterConjunctionAnd(transcriptLower: string, matchIndex: number): boolean {
  const need = " и ";
  if (matchIndex < need.length) return false;
  return transcriptLower.slice(matchIndex - need.length, matchIndex) === need;
}

function mentionScore(m: ArenaPlayerMention, transcriptLower: string, evalIdx: number): number {
  let s = MATCH_WEIGHT[m.matchType];
  s += Math.max(0, 800 - Math.min(m.index, 800));

  if (m.index < evalIdx) {
    s += BONUS_BEFORE_EVAL;
  }

  if (isAfterConjunctionAnd(transcriptLower, m.index)) {
    s -= PENALTY_AFTER_CONJ_AND;
  }

  return s;
}

function baseConfidenceFor(matchType: ArenaPlayerMention["matchType"]): number {
  return matchType === "jersey" ? 0.6 : 0.85;
}

/**
 * Все непересекающиеся по смыслу упоминания: полное ФИО, части имени (≥3), номера.
 */
export function collectArenaPlayerMentions(
  transcriptLower: string,
  roster: RosterPlayer[]
): ArenaPlayerMention[] {
  const raw: ArenaPlayerMention[] = [];

  for (const p of roster) {
    const full = normalizeArenaText(p.name);
    if (full.length >= 2) {
      for (const idx of findAllSubstringMatches(transcriptLower, full, true)) {
        raw.push({
          playerId: p.id,
          index: idx,
          matchedText: full,
          matchType: "full_name",
          baseConfidence: baseConfidenceFor("full_name"),
        });
      }
    }
    const parts = p.name.trim().split(/\s+/);
    for (const part of parts) {
      const token = part.toLowerCase();
      if (token.length < 3) continue;
      for (const idx of findAllSubstringMatches(transcriptLower, token, true)) {
        raw.push({
          playerId: p.id,
          index: idx,
          matchedText: token,
          matchType: "name_part",
          baseConfidence: baseConfidenceFor("name_part"),
        });
      }
    }
  }

  const numRe = /\b(\d{1,2})\b/g;
  let nm: RegExpExecArray | null;
  while ((nm = numRe.exec(transcriptLower)) !== null) {
    const n = parseInt(nm[1]!, 10);
    if (n < 1 || n > 99) continue;
    for (const p of roster) {
      if (p.jerseyNumber === n) {
        raw.push({
          playerId: p.id,
          index: nm.index,
          matchedText: nm[1]!,
          matchType: "jersey",
          baseConfidence: baseConfidenceFor("jersey"),
        });
        break;
      }
    }
  }

  return raw;
}

const MATCH_TYPE_ORDER: Record<ArenaPlayerMention["matchType"], number> = {
  full_name: 3,
  name_part: 2,
  jersey: 1,
};

/**
 * Один игрок — одно «лучшее» упоминание: сначала раньше по тексту, при том же индексе — сильнее тип.
 */
function collapsePerPlayer(mentions: ArenaPlayerMention[]): ArenaPlayerMention[] {
  const byId = new Map<string, ArenaPlayerMention[]>();
  for (const m of mentions) {
    const arr = byId.get(m.playerId) ?? [];
    arr.push(m);
    byId.set(m.playerId, arr);
  }
  const out: ArenaPlayerMention[] = [];
  for (const [, arr] of byId) {
    arr.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index;
      return MATCH_TYPE_ORDER[b.matchType] - MATCH_TYPE_ORDER[a.matchType];
    });
    out.push(arr[0]!);
  }
  return out;
}

/**
 * Выбор primary: максимальный score, при равенстве — меньший index, затем сильнее matchType.
 */
export function pickPrimaryArenaPlayerMention(
  transcriptLower: string,
  roster: RosterPlayer[]
): ArenaPlayerMention | null {
  const all = collectArenaPlayerMentions(transcriptLower, roster);
  if (all.length === 0) return null;

  const candidates = collapsePerPlayer(all);
  const evalIdx = firstEvalCueIndex(transcriptLower);

  const scored = candidates.map((m) => ({
    m,
    sc: mentionScore(m, transcriptLower, evalIdx),
  }));
  scored.sort((a, b) => {
    if (b.sc !== a.sc) return b.sc - a.sc;
    if (a.m.index !== b.m.index) return a.m.index - b.m.index;
    return MATCH_TYPE_ORDER[b.m.matchType] - MATCH_TYPE_ORDER[a.m.matchType];
  });

  return scored[0]?.m ?? null;
}

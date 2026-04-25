/**
 * Разбор голосового ответа при уточнении игрока после POST …/events → 422 needs_clarification.
 * Только coach-app; без серверных контрактов.
 */

import { matchRosterHint, stripWakeWordFromTranscript, type RosterEntry } from "@/lib/arenaVoiceIntentParser";
import { normalizeArenaTranscript } from "@/lib/arenaTranscriptNormalizer";

export type ClarificationVoiceCandidate = {
  id: string;
  name: string;
  jerseyNumber?: number | null;
};

export type ResolveClarificationVoiceAnswerResult =
  | { kind: "cancelled" }
  | { kind: "resolved"; playerId: string }
  | { kind: "retry" };

const RE_CANCEL =
  /^(?:отмена|не\s+надо|забудь|хватит|стоп|удали|убери|сбрось|нет)$/i;

const RE_YES = /^(?:да|ага|верно|точно|угу)$/i;

function normAnswer(raw: string): string {
  const stripped = stripWakeWordFromTranscript(raw.trim());
  return normalizeArenaTranscript(stripped).trim();
}

function toRosterEntries(candidates: ClarificationVoiceCandidate[]): RosterEntry[] {
  return candidates.map((c) => ({
    id: c.id,
    name: c.name,
    ...(c.jerseyNumber != null && Number.isFinite(c.jerseyNumber)
      ? { jerseyNumber: c.jerseyNumber }
      : {}),
  }));
}

function ordinalPick(list: ClarificationVoiceCandidate[], n: string): ClarificationVoiceCandidate | null {
  if (list.length === 0) return null;
  const tail = "(?=[\\s.,;:!?]|$)";
  if (new RegExp(`^перв(?:ый|ая|ое|ые)${tail}`, "i").test(n)) return list[0] ?? null;
  if (new RegExp(`^втор(?:ой|ая|ое|ые)${tail}`, "i").test(n)) return list[1] ?? null;
  if (new RegExp(`^трет(?:ий|ья|ье|ьи)${tail}`, "i").test(n)) return list[2] ?? null;
  if (new RegExp(`^четвёрт(?:ый|ая|ое|ые)|^четверт(?:ый|ая|ое|ые)${tail}`, "i").test(n))
    return list[3] ?? null;
  /** «Пятый» как позиция в списке — только если в списке не меньше пяти кандидатов (иначе путаница с «номер пять»). */
  if (new RegExp(`^пят(?:ый|ая|ое|ые)${tail}`, "i").test(n)) {
    if (list.length < 5) return null;
    return list[4] ?? null;
  }
  if (new RegExp(`^шест(?:ой|ая|ое|ые)${tail}`, "i").test(n)) return list[5] ?? null;
  if (/^1\b/.test(n) && list[0]) return list[0];
  if (/^2\b/.test(n) && list[1]) return list[1];
  if (/^3\b/.test(n) && list[2]) return list[2];
  return null;
}

const RU_NUM_WORD: Record<string, number> = {
  ноль: 0,
  один: 1,
  одна: 1,
  одно: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  пятёрка: 5,
  пятерка: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
  девять: 9,
  десять: 10,
};

function parseJerseyDigitToken(t: string): number | null {
  const d = t.match(/^(\d{1,3})$/);
  if (d) {
    const n = parseInt(d[1]!, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 999) return n;
  }
  const w = t.toLowerCase();
  if (RU_NUM_WORD[w] !== undefined) return RU_NUM_WORD[w]!;
  return null;
}

/**
 * Номер на майке: «номер пять», цифра, слово «пять» / «пятёрка» — только при единственном совпадении.
 * Слово «пятый» сюда не относим (позиция в списке — только {@link ordinalPick}).
 */
function resolveByJerseyNumber(n: string, candidates: ClarificationVoiceCandidate[]): string | null {
  const withJersey = candidates.filter(
    (c) => c.jerseyNumber != null && Number.isFinite(c.jerseyNumber as number)
  );
  if (withJersey.length === 0) return null;

  let target: number | null = null;
  const mNom = n.match(/номер\s+(\d{1,3}|[а-яё]+)/i);
  if (mNom) {
    const g = mNom[1]!.trim();
    const d = /^\d+$/.test(g) ? parseInt(g, 10) : parseJerseyDigitToken(g);
    if (d != null && d >= 0 && d <= 999) target = d;
  }
  if (target == null) {
    const tokens = n.split(/[\s.,;:!?]+/).filter(Boolean);
    for (const tok of tokens) {
      const d = parseJerseyDigitToken(tok);
      if (d == null) continue;
      const hits = withJersey.filter((c) => c.jerseyNumber === d);
      if (hits.length === 1) return hits[0]!.id;
    }
    return null;
  }
  const hits = withJersey.filter((c) => c.jerseyNumber === target);
  if (hits.length === 1) return hits[0]!.id;
  return null;
}

/**
 * Разбор ответа тренера по кандидатам уточнения (после 422 needs_clarification).
 */
export function resolveClarificationVoiceAnswer(
  answerText: string,
  candidates: ClarificationVoiceCandidate[]
): ResolveClarificationVoiceAnswerResult {
  const n = normAnswer(answerText);
  if (!n) return { kind: "retry" };

  if (RE_CANCEL.test(n)) {
    return { kind: "cancelled" };
  }

  if (candidates.length === 0) {
    return { kind: "retry" };
  }

  if (candidates.length === 1 && RE_YES.test(n)) {
    return { kind: "resolved", playerId: candidates[0]!.id };
  }

  const byJersey = resolveByJerseyNumber(n, candidates);
  if (byJersey) {
    return { kind: "resolved", playerId: byJersey };
  }

  if (candidates.length >= 2) {
    const ord = ordinalPick(candidates, n);
    if (ord) {
      return { kind: "resolved", playerId: ord.id };
    }
  }

  const rosterish = toRosterEntries(candidates);
  const hintNorm = matchRosterHint(n, rosterish);
  if (hintNorm) {
    return { kind: "resolved", playerId: hintNorm.id };
  }

  return { kind: "retry" };
}

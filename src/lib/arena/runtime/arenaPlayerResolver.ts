export type ArenaSpeechPlayerRow = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
};

export type ResolvePlayerFromSpeechResult =
  | { status: "not_found" }
  | { status: "ambiguous"; tier: "lastName" | "firstName" | "jerseyNumber" }
  | { status: "ok"; playerId: string };

/** Нормализация для матчинга имён/номеров (Arena live); общая с speech policy. */
export function normalizeArenaPlayerSpeechText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpeechText(text: string): string {
  return normalizeArenaPlayerSpeechText(text);
}

function normNamePart(s: string): string {
  return normalizeSpeechText(s);
}

function uniqueById(list: ArenaSpeechPlayerRow[]): ArenaSpeechPlayerRow[] {
  const seen = new Set<string>();
  const out: ArenaSpeechPlayerRow[] = [];
  for (const p of list) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/**
 * Сопоставление игрока с произнесённым текстом: фамилия → имя → номер (по приоритету).
 */
export function resolvePlayerFromSpeech(
  text: string,
  players: Array<{
    id: string;
    firstName: string;
    lastName: string;
    jerseyNumber: number | null;
  }>
): ResolvePlayerFromSpeechResult {
  const normText = normalizeSpeechText(text);
  if (!normText || players.length === 0) {
    return { status: "not_found" };
  }

  const byLast: ArenaSpeechPlayerRow[] = [];
  for (const p of players) {
    const ln = normNamePart(p.lastName);
    if (ln.length < 2) continue;
    if (normText.includes(ln)) byLast.push(p);
  }
  const lastU = uniqueById(byLast);
  if (lastU.length === 1) return { status: "ok", playerId: lastU[0]!.id };
  if (lastU.length > 1) return { status: "ambiguous", tier: "lastName" };

  const byFirst: ArenaSpeechPlayerRow[] = [];
  for (const p of players) {
    const fn = normNamePart(p.firstName);
    if (fn.length < 2) continue;
    if (normText.includes(fn)) byFirst.push(p);
  }
  const firstU = uniqueById(byFirst);
  if (firstU.length === 1) return { status: "ok", playerId: firstU[0]!.id };
  if (firstU.length > 1) return { status: "ambiguous", tier: "firstName" };

  const nums = normText.match(/\d+/g) ?? [];
  const jerseys = new Set<number>();
  for (const raw of nums) {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 999) continue;
    jerseys.add(n);
  }
  if (jerseys.size === 0) {
    return { status: "not_found" };
  }

  const byJersey: ArenaSpeechPlayerRow[] = [];
  for (const p of players) {
    if (p.jerseyNumber == null) continue;
    if (jerseys.has(p.jerseyNumber)) byJersey.push(p);
  }
  const jerU = uniqueById(byJersey);
  if (jerU.length === 1) return { status: "ok", playerId: jerU[0]!.id };
  if (jerU.length > 1) return { status: "ambiguous", tier: "jerseyNumber" };

  return { status: "not_found" };
}

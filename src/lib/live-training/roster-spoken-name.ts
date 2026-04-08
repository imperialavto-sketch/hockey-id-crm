/**
 * Сопоставление сказанного токена (имя / уменьшительное) с игроками ростера.
 */

export type SpokenRosterPlayer = { id: string; firstName: string; lastName: string };

/** Разговорные формы → возможные lower firstName из ростера. */
export const SPOKEN_TO_FIRSTNAMES: Record<string, string[]> = {
  ваня: ["иван"],
  ваню: ["иван"],
  федя: ["фёдор", "федор"],
  федю: ["фёдор", "федор"],
  коля: ["николай"],
  колю: ["николай"],
  миша: ["михаил"],
  мишу: ["михаил"],
  паша: ["павел"],
  пашу: ["павел"],
  костя: ["константин"],
  костю: ["константин"],
  лёша: ["алексей"],
  леша: ["алексей"],
  алёша: ["алексей"],
  алеша: ["алексей"],
};

function normLower(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Игроки, чьё имя или уменьшительное совпадает с токеном (без учёта регистра).
 */
export function rosterPlayersMatchingSpokenToken(
  roster: SpokenRosterPlayer[],
  token: string
): SpokenRosterPlayer[] {
  const q = normLower(token);
  if (!q) return [];

  const byFirst = roster.filter((p) => normLower(p.firstName) === q);
  if (byFirst.length > 0) return byFirst;

  const expected = SPOKEN_TO_FIRSTNAMES[q];
  if (!expected?.length) return [];
  return roster.filter((p) => expected.includes(normLower(p.firstName)));
}

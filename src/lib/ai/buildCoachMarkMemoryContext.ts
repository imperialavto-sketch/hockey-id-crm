/**
 * Собирает компактный memory context для Coach Mark.
 * Используй только переданные факты — не придумывай.
 */

export interface CoachMarkMemoryItem {
  key: string;
  value: string;
}

/**
 * Формирует компактную строку памяти для system prompt.
 */
export function buildCoachMarkMemoryContext(
  memories: CoachMarkMemoryItem[] | null | undefined
): string {
  if (!memories || memories.length === 0) return "";

  const lines = memories.map((m) => `${m.key}: ${m.value}`).filter(Boolean);
  if (lines.length === 0) return "";

  return `\n---\nДАННЫЕ ИЗ ПАМЯТИ (используй, не придумывай):\n${lines.join("\n")}`;
}

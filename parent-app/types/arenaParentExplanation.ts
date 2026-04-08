/**
 * Зеркало серверного `ArenaParentExplanation` (DTO live-training draft).
 * Парсер толерантен к частичным / старым ответам API.
 */

export type ArenaParentExplanation = {
  explanation: string;
  meaning: string;
  attention?: string;
};

export function parseArenaParentExplanation(raw: unknown): ArenaParentExplanation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const explanation = typeof o.explanation === "string" ? o.explanation.trim() : "";
  const meaning = typeof o.meaning === "string" ? o.meaning.trim() : "";
  if (!explanation || !meaning) return null;
  const attention =
    typeof o.attention === "string" && o.attention.trim() ? o.attention.trim() : undefined;
  return attention ? { explanation, meaning, attention } : { explanation, meaning };
}

/**
 * Минимальная нормализация текста события (без эвристик / LLM).
 */

export function normalizeLiveTrainingEventText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

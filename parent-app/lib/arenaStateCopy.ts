/**
 * Единый тон состояний Арены: empty, low-data, fallbacks (без LLM).
 * Спокойно, честно, без мотивационного шума.
 */

/** Когда мало тренировок/отчётов — для Today, empty, согласование с insight/summary */
export const ARENA_COPY_ACCUMULATING_SIGNALS =
  "Пока собираем сигналы из тренировок и отчётов тренера. После нескольких занятий фокус дня и недельные ориентиры станут точнее.";

/** Универсальный безопасный следующий шаг (чат / сценарии) */
export const ARENA_COPY_LOW_DATA_CTA =
  "Сценарии ниже или вопрос в чат — например: «Что сейчас важнее всего?»";

export function arenaFirstName(
  displayName: string | null | undefined
): string | null {
  const t = displayName?.trim();
  if (!t) return null;
  const parts = t.split(/\s+/).filter(Boolean);
  return parts[0] ?? null;
}

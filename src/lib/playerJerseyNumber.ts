/**
 * Игровой номер (jersey / team number) — Hockey ID
 *
 * SSOT в БД: `PlayerProfile.jerseyNumber` (Prisma). На записи игрока (`Player`) поля нет —
 * номер живёт в профиле и относится к игроку в контексте команды / года / группы школы.
 *
 * В JSON для parent/coach mobile поле обычно сериализуется как `number` (историческое имя),
 * значение берётся из `profile.jerseyNumber`.
 *
 * Правила продукта:
 * - допустимый диапазон: 1..100 (включительно);
 * - не присвоен → в API для клиента часто `0`, в UI — символ прочерка «—»;
 * - показывать везде, где отображается идентичность игрока (карточки, hero, паспорт, списки CRM).
 *
 * AI Arena / чат / voice:
 * - при совпадении имён в одной команде/группе номер — дополнительный дискриминатор в контексте;
 * - при интеграции подставлять в промпт/метаданные пару «имя + #номер» (см. coach-app dev coach-input).
 */

export const JERSEY_NUMBER_MIN = 1;
export const JERSEY_NUMBER_MAX = 100;

/** Значение из БД или тела запроса → сохранить в `PlayerProfile.jerseyNumber` или null. */
export function normalizeJerseyNumberForStorage(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  const t = Math.trunc(n);
  if (t < JERSEY_NUMBER_MIN || t > JERSEY_NUMBER_MAX) return null;
  return t;
}

/** Ответ API для клиентов: 0 = «номер не задан», иначе 1..100. */
export function normalizeJerseyNumberToApiResponse(
  raw: number | null | undefined
): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  const t = Math.trunc(raw);
  if (t < JERSEY_NUMBER_MIN || t > JERSEY_NUMBER_MAX) return 0;
  return t;
}

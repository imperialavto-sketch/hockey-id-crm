/**
 * Игровой номер — отображение и нормализация на клиенте parent-app.
 *
 * Канон в CRM/БД: `PlayerProfile.jerseyNumber` (см. `src/lib/playerJerseyNumber.ts`).
 * В API для мобильного клиента поле приходит как `number` (число); 0 = не задан.
 *
 * AI Arena: при коллизии имён в одной команде/группе использовать номер в контексте
 * (имя + #номер) — см. `hrefCoachMarkChat` / будущие query-параметры `jerseyHint`.
 *
 * @see src/lib/playerJerseyNumber.ts
 */

export const JERSEY_NUMBER_MIN = 1;
export const JERSEY_NUMBER_MAX = 100;

const EM_DASH = "\u2014";

/** Признак «номер присвоен» для UI и логики (1..100). */
export function hasJerseyNumber(n: number | null | undefined): boolean {
  if (n == null || !Number.isFinite(n)) return false;
  const t = Math.trunc(n);
  return t >= JERSEY_NUMBER_MIN && t <= JERSEY_NUMBER_MAX;
}

/** Нормализация значения из API: вне диапазона → 0 (как «не задан»). */
export function normalizeJerseyFromApi(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return 0;
  const t = Math.trunc(n);
  if (t < JERSEY_NUMBER_MIN || t > JERSEY_NUMBER_MAX) return 0;
  return t;
}

/** Крупные блоки / hero: `#17` или прочерк. */
export function formatPlayerJerseyHashOrDash(n: number | null | undefined): string {
  if (!hasJerseyNumber(n)) return EM_DASH;
  return `#${Math.trunc(n!)}`;
}

/**
 * Канонический формат номера в UI: `#93` или «—» (не «№», не сырое число).
 * Для декоративного слоя без прочерка используйте `HeroJerseyIdentityAccent` (рендер только при наличии номера).
 */
export function formatPlayerNumber(n: number | null | undefined): string {
  return formatPlayerJerseyHashOrDash(n);
}

/** Строки таблиц / паспорт: `17` или прочерк. */
export function formatPlayerJerseyPlainOrDash(n: number | null | undefined): string {
  if (!hasJerseyNumber(n)) return EM_DASH;
  return String(Math.trunc(n!));
}

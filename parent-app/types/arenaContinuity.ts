/**
 * Local snapshot for Arena re-entry / continuity (AsyncStorage-backed elsewhere).
 * Поле ввода для `deriveArenaReentry` в `lib/arenaReentry.ts`; в `app/**` нет экранов, импортирующих `deriveArenaReentry`.
 */

export type ArenaContinuitySnapshot = {
  updatedAt: string;
  lastInsight?: { focus?: string };
  lastUserIntent?: string;
  lastAdvice?: string;
};

/**
 * Shared copy + visual tokens for flagship parent screens (no business logic).
 * Feature modules re-export or compose these alongside screen-specific strings.
 */

export const PARENT_FLAGSHIP = {
  networkRetrySubtitle: "Проверьте соединение и нажмите «Повторить»",
  playerNotFoundTitle: "Игрок не найден",
  playerNotFoundSubtitle: "Проверьте ссылку или выберите другого игрока",
  /** Muted chevron for list rows / CTAs (light-on-dark). */
  chevronMutedIcon: "rgba(255,255,255,0.35)",
} as const;

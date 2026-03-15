/**
 * Unified typography — all text styles use these tokens.
 */

export const typography = {
  /** Screen title — main page heading */
  screenTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  /** Section title — blocks within a screen */
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  /** Card / block title */
  cardTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  /** Body text */
  body: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  /** Smaller body */
  bodySmall: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  /** Caption, metadata */
  caption: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  /** Smallest label */
  captionSmall: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  /** Hero / large display (e.g. player number) */
  hero: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: "900" as const,
    letterSpacing: -2,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  heroMeta: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  /** Legacy aliases for gradual migration */
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 20, fontWeight: "700" as const },
  section: { fontSize: 18, fontWeight: "600" as const },
  tab: { fontSize: 11, fontWeight: "600" as const },
} as const;

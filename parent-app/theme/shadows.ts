/**
 * Depth system — 3 levels.
 * Level 0: background (no shadow)
 * Level 1: standard surface — subtle
 * Level 2: emphasized — slightly stronger
 */

export const shadows = {
  /** Standard cards — delicate, not heavy */
  level1: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  /** Hero, primary cards — soft lift */
  level2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  /** Accent glow for key cards */
  accentGlow: {
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;

/**
 * Text color hierarchy — use systematically.
 * primary: main content
 * secondary: supporting text
 * muted: metadata, captions, low priority
 * accent: CTAs, active states, key numbers
 */

export const textColors = {
  primary: "#F5F7FF",
  secondary: "rgba(220,230,255,0.8)",
  muted: "rgba(220,230,255,0.5)",
  accent: "#60A5FA",
} as const;

/**
 * Surface/depth colors
 * Level 0: background
 * Level 1: standard cards
 * Level 2: emphasized (hero, primary cards)
 */
export const surfaceColors = {
  level0: "#020617",
  level0Alt: "#050a18",
  level1: "rgba(255,255,255,0.05)",
  level1Border: "rgba(255,255,255,0.06)",
  level2: "rgba(255,255,255,0.08)",
  level2Border: "rgba(255,255,255,0.1)",
} as const;

export const accentColors = {
  primary: "#3B82F6",
  secondary: "#60A5FA",
  soft: "rgba(59,130,246,0.18)",
} as const;

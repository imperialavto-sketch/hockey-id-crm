/**
 * Design System — Shared tokens
 */

// ==================== COLORS ====================
export const colors = {
  bgDeep: "#020617",
  bgMid: "#0B1B34",
  bgSurface: "#0F2747",

  glass: "rgba(255,255,255,0.06)",
  glassStrong: "rgba(255,255,255,0.08)",

  borderSoft: "rgba(255,255,255,0.08)",

  textPrimary: "#F5F7FF",
  textSecondary: "rgba(220,230,255,0.72)",

  accentBlue: "#3B82F6",
  accentBlueSoft: "#60A5FA",

  accentRed: "#EF4444",

  tabBarBackground: "rgba(10,15,30,0.55)",
} as const;

// ==================== SPACING (aligned with constants/theme) ====================
export const spacing = {
  screenPadding: 16,
  sectionGap: 24,
  cardGap: 16,
} as const;

// ==================== RADIUS (aligned with card radius 20) ====================
export const radius = {
  lg: 20,
  md: 18,
  sm: 14,
  capsule: 999,
} as const;

// ==================== SHADOWS ====================
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
} as const;

// ==================== GLASS CARD ====================
export const glassCard = {
  backgroundColor: colors.glass,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.borderSoft,
  overflow: "hidden" as const,
  ...shadows.card,
} as const;

// ==================== SKILL BAR ====================
export const skillBar = {
  height: 6,
  borderRadius: radius.capsule,
  shadowColor: colors.accentBlue,
  shadowOpacity: 0.6,
  shadowRadius: 10,
} as const;

// ==================== GRADIENTS ====================
export const gradients = {
  skillBar: [colors.accentBlue, colors.accentRed] as const,
} as const;

// ==================== TIMELINE DOT GLOW ====================
export const timelineDotGlow = {
  achievement: { shadowColor: "#FFD35A", shadowOpacity: 0.6 },
  coach: { shadowColor: colors.accentBlue, shadowOpacity: 0.6 },
  skill: { shadowColor: "#39D98A", shadowOpacity: 0.6 },
} as const;

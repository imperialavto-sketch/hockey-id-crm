/**
 * Space Ice Glass UI — Unified Premium Design System
 * Apple / Tesla / NHL style
 */

// ==================== COLORS ====================
export const colors = {
  // Background (Level 0)
  bgDeep: "#020617",
  bgMid: "#0B1B34",
  bgLight: "#0F2747",
  // Text hierarchy
  textPrimary: "#F5F7FF",
  textSecondary: "rgba(220,230,255,0.8)",
  textMuted: "rgba(220,230,255,0.5)",
  // Primary accents (use sparingly)
  accent: "#3B82F6",
  accentSecondary: "#60A5FA",
  accentDanger: "#EF4444",
  // Glass
  glass: "rgba(255,255,255,0.06)",
  glassStrong: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.08)",
  // Surface levels (depth)
  surfaceLevel1: "rgba(255,255,255,0.05)",
  surfaceLevel1Border: "rgba(255,255,255,0.06)",
  surfaceLevel2: "rgba(255,255,255,0.08)",
  surfaceLevel2Border: "rgba(255,255,255,0.1)",
  // States
  success: "#39D98A",
  warning: "#FFD35A",
  error: "#EF4444",
  errorSoft: "rgba(239,68,68,0.15)",
  errorBorder: "rgba(239,68,68,0.4)",
  // Legacy compat
  text: "#F5F7FF",
  surface: "rgba(255,255,255,0.06)",
  card: "rgba(255,255,255,0.06)",
  background: "#020617",
  primary: "#3B82F6",
  cyan: "#3B82F6",
  neonBlue: "#60A5FA",
  onAccent: "#FFFFFF",
  accentSoft: "rgba(59,130,246,0.2)",
  accentBlue: "#3B82F6",
  accentBlueSoft: "rgba(59,130,246,0.2)",
  accentBright: "#60A5FA",
  accentRed: "#EF4444",
  errorText: "#FF5A5A",
  successSoft: "rgba(57,217,138,0.15)",
  surfaceLightAlt: "rgba(255,255,255,0.04)",
  glassLight: "rgba(255,255,255,0.06)",
  amber: "#FFD35A",
  cardBg: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.08)",
  errorSoftBg: "rgba(239,68,68,0.15)",
} as const;

// ==================== OVERLAY ====================
export const overlay = {
  gradient: ["rgba(2,6,23,0.85)", "rgba(2,6,23,0.95)"] as const,
  subtle: "rgba(2,6,23,0.85)",
  dark: "rgba(0,0,0,0.3)",
} as const;

// ==================== FEEDBACK (pressed states) ====================
/** Standard pressed opacity for buttons/cards. Use for visual consistency. */
export const feedback = {
  pressedOpacity: 0.88,
} as const;

// ==================== RADIUS ====================
export const radius = {
  sm: 14,
  md: 18,
  lg: 20,
  xl: 24,
  full: 9999,
  capsule: 999,
};

export const radii = {
  xs: 8,
  sm: 14,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 24,
  full: 9999,
  capsule: 999,
};

// ==================== SPACING (unified) ====================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  sectionGap: 24,
  cardGap: 16,
  screenPadding: 16,
  screenBottom: 24,
  listGap: 16,
  gridGap: 12,
  // Legacy numeric keys
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;

// ==================== SHADOWS (depth system) ====================
export const shadows = {
  /** Level 1: standard cards */
  level1: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  /** Level 2: hero, primary cards */
  level2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  /** Accent glow for key elements */
  accentGlow: {
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const cardShadow = shadows.level1;
export const glowShadow = shadows.accentGlow;

// ==================== TYPOGRAPHY (unified) ====================
export const typography = {
  screenTitle: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 18, fontWeight: "600" as const },
  cardTitle: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "500" as const },
  bodySmall: { fontSize: 15, fontWeight: "500" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  captionSmall: { fontSize: 12, fontWeight: "500" as const },
  hero: { fontSize: 32, fontWeight: "700" as const },
  heroNumber: { fontSize: 72, fontWeight: "900" as const, letterSpacing: -2 },
  heroName: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.5 },
  heroMeta: { fontSize: 14, fontWeight: "500" as const },
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 20, fontWeight: "700" as const },
  section: { fontSize: 18, fontWeight: "600" as const },
  tab: { fontSize: 11, fontWeight: "600" as const },
};

// ==================== CARD (surface levels) ====================
export const glassCard = {
  backgroundColor: colors.surfaceLevel1,
  borderWidth: 1,
  borderColor: colors.surfaceLevel1Border,
  borderRadius: 20,
  overflow: "hidden" as const,
  ...shadows.level1,
};

export const cardStyles = {
  radius: 20,
  padding: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: colors.surfaceLevel1Border,
  backgroundColor: colors.surfaceLevel1,
  shadow: shadows.level1,
};

/** Emphasized card (hero, primary block) */
export const cardEmphasized = {
  backgroundColor: colors.surfaceLevel2,
  borderWidth: 1,
  borderColor: colors.surfaceLevel2Border,
  borderRadius: 20,
  ...shadows.level2,
};

export const profileHeaderGlass = { ...glassCard, padding: spacing.screenPadding };

export const statsCardGlass = {
  backgroundColor: colors.glass,
  borderRadius: radius.lg,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.borderSoft,
};

// ==================== BUTTON STYLES (unified: height 48, radius 14, paddingH 20) ====================
export const buttonStyles = {
  primary: {
    height: 48,
    radius: 14,
    paddingHorizontal: 20,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  secondary: {
    height: 48,
    radius: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "transparent",
  },
  ghost: {
    height: 48,
    radius: 14,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  danger: {
    height: 48,
    radius: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorSoft,
  },
  iconGap: 8,
};

// ==================== INPUT STYLES (unified) ====================
export const inputStyles = {
  height: 48,
  minHeight: 48,
  radius: 14,
  paddingHorizontal: 16,
  paddingVertical: 14,
  backgroundColor: "rgba(10,20,40,0.65)",
  borderWidth: 1,
  borderColor: colors.borderSoft,
  borderColorFocus: colors.accent,
  borderColorError: colors.error,
  fontSize: 16,
  placeholderColor: colors.textMuted,
  formFieldGap: 16,
} as const;

// ==================== ROW / LIST ITEM (unified) ====================
export const rowStyles = {
  minHeight: 44,
  paddingVertical: 12,
  paddingHorizontal: 16,
  gap: 8,
  titleSize: 16,
  titleWeight: "600" as const,
  subtitleSize: 13,
  subtitleColor: "rgba(220,230,255,0.6)",
} as const;

// ==================== SCREEN HEADER ====================
export const screenHeader = {
  paddingTop: 16,
  paddingBottom: 16,
  paddingHorizontal: 16,
  titleSize: 18,
  titleWeight: "700" as const,
  subtitleSize: 13,
  buttonSize: 44,
  iconSize: 24,
  borderColor: colors.surfaceLevel1Border,
} as const;

// ==================== TAB BAR ====================
export const tabBar = {
  background: "rgba(10,15,30,0.6)",
  borderTop: "rgba(255,255,255,0.06)",
  active: "#3B82F6",
  activeGlow: "rgba(59,130,246,0.8)",
  inactive: "rgba(255,255,255,0.42)",
  labelSize: 11,
  iconSize: 24,
  height: 56,
} as const;

// ==================== GRADIENTS ====================
export const gradients = {
  bg: ["#020617", "#0B1B34", "#0F2747"] as const,
  primary: ["#3B82F6", "#60A5FA"] as const,
  primaryDanger: ["#3B82F6", "#EF4444"] as const,
  accentGlow: ["rgba(59,130,246,0.2)", "rgba(96,165,250,0.1)"] as const,
} as const;

export const glow = {
  accent: "rgba(59,130,246,0.25)",
  accentSoft: "rgba(59,130,246,0.15)",
};

// ==================== AI MATCH BADGE ====================
export const aiMatchBadge = {
  backgroundColor: "rgba(59,130,246,0.2)",
  borderColor: "rgba(59,130,246,0.4)",
  textColor: "#60A5FA",
};

// ==================== OVR BADGE ====================
export const ovrBadge = {
  backgroundColor: "rgba(255,255,255,0.15)",
  borderColor: "rgba(255,255,255,0.2)",
};

// ==================== GLASS / ICE TOKENS (flagship surfaces) ====================
/** Chevron / secondary icons on glass and section headers */
export const sectionIcon = {
  color: "rgba(200,220,255,0.55)" as const,
};

/** Text hierarchy on ice-glass backgrounds (see PARENT_APP_UI_RULES). */
export const textOnGlass = {
  heading: colors.textPrimary,
  secondary: colors.textSecondary,
  meta: colors.textMuted,
  body: "rgba(230,240,255,0.88)" as const,
} as const;

const ICE_FACE_GRADIENT = [
  "rgba(255,255,255,0.14)",
  "rgba(186,230,253,0.08)",
  "rgba(15,39,71,0.92)",
] as const;

const ICE_CORNER_GLOW_COLORS = [
  "rgba(255,255,255,0.22)",
  "rgba(56,189,248,0.08)",
] as const;

const ICE_CORNER_GLOW_LOCATIONS = [0.2, 1] as const;

export const glassVisual = {
  shellLarge: {
    borderRadius: radius.lg,
    overflow: "hidden" as const,
    backgroundColor: "rgba(12,22,40,0.72)",
  },
  shellSmall: {
    borderRadius: radius.md,
    overflow: "hidden" as const,
    backgroundColor: "rgba(12,22,40,0.68)",
  },
  edgeRingDefault: "rgba(148,197,255,0.35)",
  edgeRingSubtle: "rgba(148,197,255,0.22)",
  outerHaloFill: "rgba(56,189,248,0.06)",
  iceFaceGradient: ICE_FACE_GRADIENT,
  iceBottomGlow: "rgba(56,189,248,0.14)",
  iceCornerGlowColors: ICE_CORNER_GLOW_COLORS,
  iceCornerGlowLocations: ICE_CORNER_GLOW_LOCATIONS,
  textComfortTint: "rgba(2,6,23,0.08)",
  topEdgeHighlight: "rgba(255,255,255,0.14)",
} as const;

export const iceEdgeGlow = {
  default: {
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  subtle: {
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
} as const;

export const glassSectionIconBadge = {
  default: {
    backgroundColor: "rgba(59,130,246,0.35)",
    borderWidth: 1,
    borderColor: "rgba(148,197,255,0.45)",
  },
  accent: {
    backgroundColor: "rgba(59,130,246,0.5)",
    borderWidth: 1,
    borderColor: "rgba(186,230,253,0.55)",
  },
  success: {
    backgroundColor: "rgba(57,217,138,0.42)",
    borderWidth: 1,
    borderColor: "rgba(167,243,208,0.5)",
  },
  glyph: "#FFFFFF" as const,
  shadow: {
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  shadowSuccess: {
    shadowColor: "#39D98A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

import { colors, radius, spacing, typography } from "@/constants/theme";

export const uiColors = {
  glassBg: "rgba(10,24,46,0.58)",
  glassBgHighlight: "rgba(12,30,58,0.64)",
  glassBgSuccess: "rgba(10,28,40,0.64)",
  glassBorder: "rgba(190,230,255,0.24)",
  glassBorderHighlight: "rgba(59,130,246,0.38)",
  glassBorderSuccess: "rgba(34,197,94,0.36)",
  textPrimary: "#F6FBFF",
  textSecondary: "rgba(214,232,255,0.9)",
  textMeta: colors.textMuted,
  accentBlue: colors.accent,
  accentGreen: colors.success,
} as const;

export const uiSpacing = {
  x8: spacing.sm,
  x12: spacing.md,
  x16: spacing.lg,
  x20: spacing.xl,
  x24: spacing.xxl,
  x32: spacing.xxxl,
} as const;

export const uiTypography = {
  title: { ...typography.heroName },
  sectionTitle: { ...typography.sectionTitle, fontWeight: "800" as const },
  subtitle: { ...typography.caption, fontSize: 15, fontWeight: "700" as const },
  meta: { ...typography.captionSmall, fontWeight: "600" as const },
} as const;

export const uiRadius = {
  card: radius.lg,
  hero: radius.xl,
} as const;

export const uiHero = {
  topOffset: spacing.md,
  titleSubtitleGap: 4,
  blockBottomGap: spacing.lg,
} as const;

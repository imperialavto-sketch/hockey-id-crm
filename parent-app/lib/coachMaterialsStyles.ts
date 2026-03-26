/**
 * Shared visual styles for coach materials detail screens (report / action / draft).
 */
import { StyleSheet } from "react-native";
import { colors, spacing, radius } from "@/constants/theme";

export const coachMaterialsDetailStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  headerSpacer: { width: 44 },
  skeletonWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  skeletonLine: {
    borderRadius: radius.sm,
    width: "70%",
  },
  skeletonMeta: {
    borderRadius: radius.sm,
    width: "40%",
  },
  skeletonBody: {
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  centerBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  mutedText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    fontSize: 15,
    color: colors.errorText,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    marginBottom: spacing.lg,
  },
  kindKicker: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  voiceHint: {
    fontSize: 12,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
  },
  metaLine: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  metaDate: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  metaDateSecondary: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
  },
});

/** Hub-only: summary + list row surfaces (parent coach materials index). */
export const coachMaterialsHubStyles = StyleSheet.create({
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTotal: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  summaryHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  summaryBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  summaryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  rowCard: {
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.md,
  },
  rowCardGap: {
    marginTop: spacing.sm,
  },
  rowMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowPill: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 0.2,
  },
});

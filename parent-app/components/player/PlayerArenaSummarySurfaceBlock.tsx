/**
 * PHASE 6: ❗ NOT CORE SCHOOL SSOT — сводка внешнего контура (`/api/arena/summary-surface`), не coach live Arena.
 */
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ArenaSummaryNextStepChip } from "@/components/arena/ArenaSummaryNextStepChip";
import { colors, spacing, radius, shadows } from "@/constants/theme";
import type { ArenaSummarySurfaceView } from "@/services/arenaExternalTrainingService";
import {
  ARENA_STATE_PILL_TYPO,
  ARENA_SUMMARY_CARD_BG,
  ARENA_SUMMARY_TONE_PALETTE,
  clampArenaSummaryText,
  sliceArenaExplanationPoints,
} from "@/lib/arenaSummaryPresentation";

type Props = {
  surface: ArenaSummarySurfaceView;
};

/** Быстрый скан 2–3 с: статус, короткая суть, один сигнал, следующий шаг. Без «почему» — это в overview ниже. */
const QUICK_SUMMARY_MAX_CHARS = 148;

/** Одна граница: этот блок — `GET /api/arena/summary-surface`, не школьная сводка последней тренировки (hero). */
const SUMMARY_SURFACE_BOUNDARY_LINE = "Внешний контур развития в Арене";

function clampQuickScan(text: string, max: number): string {
  const t = text.trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Профиль: верхний слой «что сейчас» — компактнее полной карточки с длинными пояснениями.
 */
export function PlayerArenaSummarySurfaceBlock({ surface }: Props) {
  const tone = ARENA_SUMMARY_TONE_PALETTE[surface.stateTone];
  const summaryRaw = clampArenaSummaryText(surface.summary, "player");
  const summaryQuick = clampQuickScan(summaryRaw, QUICK_SUMMARY_MAX_CHARS);
  const explainAll = sliceArenaExplanationPoints(surface.explanationPoints, "player");
  const keySignal = explainAll[0]?.trim() ?? "";

  return (
    <View style={styles.outer} accessibilityRole="text">
      <LinearGradient
        colors={[tone.glow[0], tone.glow[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.glow}
      />
      <View style={styles.card}>
        <Text style={styles.boundaryLine} numberOfLines={1}>
          {SUMMARY_SURFACE_BOUNDARY_LINE}
        </Text>
        <Text style={styles.kicker}>Сейчас</Text>
        <View
          style={[
            styles.pill,
            { backgroundColor: tone.pillBg, borderColor: tone.pillBorder },
          ]}
        >
          <Text
            style={[styles.pillText, { color: tone.pillText }]}
            numberOfLines={2}
          >
            {surface.stateLabel}
          </Text>
        </View>
        {summaryQuick ? (
          <Text style={styles.summary} numberOfLines={3} ellipsizeMode="tail">
            {summaryQuick}
          </Text>
        ) : null}
        {keySignal ? (
          <Text style={styles.keySignal} numberOfLines={2} ellipsizeMode="tail">
            {keySignal}
          </Text>
        ) : null}
        {surface.nextStepLabel ? (
          <ArenaSummaryNextStepChip label={surface.nextStepLabel} variant="expanded" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.level1,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.surfaceLevel2Border,
    backgroundColor: ARENA_SUMMARY_CARD_BG,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 2,
    gap: spacing.xs + 2,
  },
  boundaryLine: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: "rgba(148,163,184,0.92)",
    marginBottom: 2,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.05,
    textTransform: "uppercase",
    color: "rgba(203,213,225,0.72)",
  },
  pill: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingVertical: ARENA_STATE_PILL_TYPO.paddingVerticalCompact,
    paddingHorizontal: ARENA_STATE_PILL_TYPO.paddingHorizontal,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
  },
  pillText: {
    fontSize: ARENA_STATE_PILL_TYPO.fontSize,
    fontWeight: ARENA_STATE_PILL_TYPO.fontWeight,
    letterSpacing: ARENA_STATE_PILL_TYPO.letterSpacing,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  keySignal: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
});

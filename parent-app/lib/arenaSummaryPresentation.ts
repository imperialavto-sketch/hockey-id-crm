import type { ArenaSummarySurfaceView } from "@/services/arenaExternalTrainingService";

/**
 * Presentation-only контракт для Arena Summary Surface (home entry ↔ player expanded).
 * Без сетевых вызовов и бизнес-логики — только токены, обрезка текста и счётчики.
 */

export type ArenaSummaryPresentationMode = "home" | "player";

/** Единая палитра тона состояния для обеих поверхностей */
export const ARENA_SUMMARY_TONE_PALETTE: Record<
  ArenaSummarySurfaceView["stateTone"],
  {
    pillBg: string;
    pillBorder: string;
    pillText: string;
    glow: readonly [string, string];
  }
> = {
  active: {
    pillBg: "rgba(59,130,246,0.14)",
    pillBorder: "rgba(96,165,250,0.45)",
    pillText: "rgba(191,219,254,0.95)",
    glow: ["rgba(59,130,246,0.22)", "rgba(59,130,246,0.04)"] as const,
  },
  calm: {
    pillBg: "rgba(148,163,184,0.12)",
    pillBorder: "rgba(148,163,184,0.35)",
    pillText: "rgba(226,232,240,0.88)",
    glow: ["rgba(148,163,184,0.14)", "rgba(148,163,184,0.03)"] as const,
  },
  watchful: {
    pillBg: "rgba(100,116,139,0.12)",
    pillBorder: "rgba(100,116,139,0.32)",
    pillText: "rgba(203,213,225,0.85)",
    glow: ["rgba(100,116,139,0.12)", "rgba(15,23,42,0.2)"] as const,
  },
};

/** Смысловой контракт подписей (не серверные строки) */
export const ARENA_SURFACE_COPY = {
  brandKicker: "Арена",
  nextStepEyebrow: "Следующий шаг",
  homeCta: "Подробнее",
  homeCtaA11yLabel: "Подробнее об Арене в профиле игрока",
} as const;

/** Фон карточки — одна система глубины */
export const ARENA_SUMMARY_CARD_BG = "rgba(15,23,42,0.55)";

/** Разделитель секций пояснений / CTA */
export const ARENA_SUMMARY_DIVIDER_RGBA = "rgba(148,163,184,0.2)";

/** Блок «следующий шаг» — общая грамматика (chip), размер задаётся вариантом */
export const ARENA_NEXT_STEP_SURFACE = {
  backgroundColor: "rgba(59,130,246,0.1)",
  borderColor: "rgba(59,130,246,0.22)",
} as const;

export const ARENA_NEXT_STEP_TEXT = {
  eyebrow: "rgba(147,197,253,0.75)",
  value: "rgba(224,242,254,0.95)",
} as const;

export type ArenaNextStepVariant = "compact" | "expanded";

export function arenaNextStepMetrics(variant: ArenaNextStepVariant) {
  if (variant === "compact") {
    return {
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 18,
      gap: 2,
      eyebrowFontSize: 9,
      eyebrowLetterSpacing: 0.85,
      valueFontSize: 13,
      valueLineHeight: 18,
      valueLetterSpacing: -0.15,
      eyebrowFontWeight: "700" as const,
      valueFontWeight: "600" as const,
    };
  }
  return {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 2,
    eyebrowFontSize: 10,
    eyebrowLetterSpacing: 0.9,
    valueFontSize: 14,
    valueLineHeight: 20,
    valueLetterSpacing: -0.2,
    eyebrowFontWeight: "700" as const,
    valueFontWeight: "600" as const,
  };
}

const SUMMARY_MAX_CHARS: Record<ArenaSummaryPresentationMode, number | null> = {
  home: 130,
  player: null,
};

export function maxArenaExplanationCount(mode: ArenaSummaryPresentationMode): number {
  return mode === "home" ? 2 : 3;
}

export function clampArenaSummaryText(text: string, mode: ArenaSummaryPresentationMode): string {
  const max = SUMMARY_MAX_CHARS[mode];
  const t = text.trim();
  if (!t) return "";
  if (max == null) return t;
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1).trimEnd();
  return `${slice}…`;
}

export function sliceArenaExplanationPoints(
  points: readonly string[],
  mode: ArenaSummaryPresentationMode
): string[] {
  return points.slice(0, maxArenaExplanationCount(mode));
}

/** Типографика бренд-кикера «Арена» */
export const ARENA_BRAND_KICKER_TYPO = {
  fontSize: 10,
  fontWeight: "700" as const,
  letterSpacing: 1.05,
} as const;

/** Общая грамматика pill состояния (размер шрифта один на обеих поверхностях) */
export const ARENA_STATE_PILL_TYPO = {
  fontSize: 12,
  fontWeight: "600" as const,
  letterSpacing: -0.1,
  paddingVerticalExpanded: 5,
  paddingVerticalCompact: 4,
  paddingHorizontal: 10,
} as const;

/** Пояснения: одна иерархия цвета/межстрочного */
export const ARENA_EXPLAIN_TYPO = {
  fontSize: 12.5,
  lineHeight: 18,
} as const;

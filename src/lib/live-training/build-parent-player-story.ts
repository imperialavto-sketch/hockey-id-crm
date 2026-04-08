/**
 * PHASE 14: мягкие story items для родителя из scoped summaries (без внутренней терминологии).
 */

import type { ParentLiveTrainingScopedSummary } from "./parent-latest-live-training-summary";
import type { PlayerStoryItemDto } from "./player-story-model";

export function buildParentPlayerStoryItems(
  summaries: ParentLiveTrainingScopedSummary[]
): PlayerStoryItemDto[] {
  if (summaries.length === 0) return [];

  const latest = summaries[0]!;
  const items: PlayerStoryItemDto[] = [];

  items.push({
    type: "training_summary",
    date: null,
    title: latest.sessionMeta.dateLabel
      ? `Тренировка · ${latest.sessionMeta.dateLabel}`
      : "Последняя тренировка",
    body: latest.shortSummary.trim() || "Сохранена краткая фиксация тренировки.",
    tone: "neutral",
  });

  const h0 = latest.highlights[0]?.trim();
  if (h0) {
    items.push({
      type: "positive_signal",
      date: null,
      title: "Что получилось хорошо",
      body: h0,
      tone: "positive",
    });
  }

  const f0 = latest.developmentFocus[0]?.trim();
  if (f0) {
    items.push({
      type: "focus_area",
      date: null,
      title: "Над чем продолжаем работать",
      body: f0,
      tone: "attention",
    });
  }

  if (summaries.length >= 2) {
    const prev = summaries[1]!;
    const prevLine = prev.shortSummary.trim();
    items.push({
      type: "trend_note",
      date: null,
      title: "В динамике",
      body: prevLine
        ? `На предыдущей тренировке (${prev.sessionMeta.dateLabel}): ${prevLine.slice(0, 160)}${prevLine.length > 160 ? "…" : ""}`
        : "Есть данные по предыдущим тренировкам — картина складывается постепенно.",
      tone: "neutral",
    });
  }

  return items.slice(0, 4);
}

export function parentStoryLowData(summaries: ParentLiveTrainingScopedSummary[]): boolean {
  return summaries.length === 0;
}

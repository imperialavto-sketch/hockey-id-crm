/**
 * PHASE 14: operational story items из bundle сигналов live training (без LLM).
 */

import type { PlayerLiveTrainingSignalsBundleDto } from "./get-coach-player-live-training-signals";
import type { PlayerStoryItemDto } from "./player-story-model";

const MODE_RU: Record<string, string> = {
  ice: "Лёд",
  ofp: "ОФП",
  mixed: "Смешанная",
};

function modeLabel(mode: string): string {
  return MODE_RU[mode] ?? mode;
}

export function buildCoachPlayerStoryItems(
  bundle: PlayerLiveTrainingSignalsBundleDto
): PlayerStoryItemDto[] {
  const { summary, trendSummary, timeline, latestSignals } = bundle;
  if (summary.totalSignals === 0) {
    return [];
  }

  const items: PlayerStoryItemDto[] = [];

  if (!trendSummary.insufficientForPatterns) {
    const pos = trendSummary.dominantPositiveDomains.map((d) => d.domainLabelRu).join(", ");
    const rep = trendSummary.repeatedAttentionAreas.map((a) => a.domainLabelRu).join(", ");
    const negDom = trendSummary.dominantNegativeDomains.map((d) => d.domainLabelRu).join(", ");
    const attentionPart = rep || negDom;
    const trendBody = [
      pos ? `Позитивные акценты чаще в темах: ${pos}.` : null,
      attentionPart ? `Зоны внимания: ${attentionPart}.` : null,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (trendBody) {
      items.push({
        type: "trend_note",
        date: summary.lastSignalAt,
        title: "Динамика в последних тренировках",
        body: trendBody,
        tone: attentionPart ? "attention" : "positive",
      });
    }
  }

  for (const t of timeline.slice(0, 3)) {
    const topics = t.topDomains.map((d) => d.domainLabelRu).join(", ") || "—";
    items.push({
      type: "training_summary",
      date: t.startedAt,
      title: `Тренировка · ${modeLabel(t.sessionMode)}`,
      body: `Сигналов: ${t.totalSignals} (+${t.positiveCount} / внимание ${t.negativeCount} / нейтр. ${t.neutralCount}). Темы: ${topics}.`,
      tone:
        t.negativeCount > t.positiveCount
          ? "attention"
          : t.positiveCount > 0
            ? "positive"
            : "neutral",
    });
  }

  for (const s of latestSignals.slice(0, 2)) {
    items.push({
      type: "positive_signal",
      date: s.createdAt,
      title: s.topicLabelRu,
      body: s.evidenceText,
      tone:
        s.signalDirection === "negative"
          ? "attention"
          : s.signalDirection === "positive"
            ? "positive"
            : "neutral",
    });
  }

  for (const r of trendSummary.repeatedAttentionAreas.slice(0, 2)) {
    items.push({
      type: "focus_area",
      date: summary.lastSignalAt,
      title: `Повторяющееся внимание · ${r.domainLabelRu}`,
      body: `В последнем окне сигналов: ${r.negativeCount} отметок «требуют внимания» по этой теме.`,
      tone: "attention",
    });
  }

  items.sort((a, b) => {
    const da = a.date ? Date.parse(a.date) : 0;
    const db = b.date ? Date.parse(b.date) : 0;
    return db - da;
  });

  const seen = new Set<string>();
  const deduped: PlayerStoryItemDto[] = [];
  for (const it of items) {
    const key = `${it.type}|${it.title}|${it.body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  return deduped.slice(0, 6);
}

export function coachStoryLowData(
  bundle: PlayerLiveTrainingSignalsBundleDto,
  items: PlayerStoryItemDto[]
): boolean {
  return bundle.summary.totalSignals === 0 || items.length === 0;
}

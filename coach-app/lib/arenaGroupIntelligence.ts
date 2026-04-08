/**
 * Групповой слой Арены: эвристики по сегменту (группа / слот), без ML и без новых API live-training.
 * Живёт отдельно от player-level intelligence в arenaCoachIntelligence.
 */

import type { LiveTrainingEventItem } from "@/services/liveTrainingService";
import type { LiveTrainingObservationDraft } from "@/types/liveTraining";
import { DOMAIN_TITLE_RU, type DevelopmentDomain } from "@/lib/coachAgeStandardsPresentation";
import type { PlayerDevelopmentStressMap } from "@/lib/arenaDevelopmentMapping";

export type ArenaGroupCoachInsightKind = "GROUP_FOCUS" | "GROUP_ALERT" | "GROUP_BALANCE";

export type ArenaGroupCoachInsight = {
  kind: ArenaGroupCoachInsightKind;
  priority: number;
  tts: string;
};

function sortByTimeAsc(events: LiveTrainingEventItem[]): LiveTrainingEventItem[] {
  return [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function filterPlayerCoachEvents(events: LiveTrainingEventItem[]): LiveTrainingEventItem[] {
  return sortByTimeAsc(events).filter((e) => {
    if (!e.playerId?.trim()) return false;
    const st = (e.sourceType ?? "").toLowerCase();
    return st === "transcript_segment" || st === "manual_stub";
  });
}

function normSentiment(s: string | null | undefined): "positive" | "negative" | "neutral" | null {
  const t = (s ?? "").trim().toLowerCase();
  if (t === "positive" || t === "negative" || t === "neutral") return t;
  return null;
}

function groupLabelShort(label: string): string {
  const t = label.trim();
  return t || "группе";
}

/**
 * Несколько фиксаций подряд по разным игрокам сегмента — смена «сидит» на группе.
 */
export function detectGroupFocus(
  events: LiveTrainingEventItem[],
  groupPlayerIds: ReadonlySet<string>,
  groupLabel: string
): ArenaGroupCoachInsight | null {
  if (groupPlayerIds.size === 0) return null;
  const pe = filterPlayerCoachEvents(events);
  if (pe.length < 5) return null;
  const tail = pe.slice(-8);
  const inGroup = tail.filter((e) => e.playerId && groupPlayerIds.has(e.playerId.trim()));
  if (inGroup.length < 4) return null;
  const ratio = inGroup.length / tail.length;
  const distinct = new Set(inGroup.map((e) => e.playerId!.trim()));
  if (ratio < 0.62 || distinct.size < 2) return null;
  const g = groupLabelShort(groupLabel);
  return {
    kind: "GROUP_FOCUS",
    priority: 54,
    tts: `Сейчас плотнее фиксируешь ${g} — сегмент в основном фокусе.`,
  };
}

/**
 * Подряд минусы у разных игроков одной группы.
 */
export function detectGroupAlerts(
  events: LiveTrainingEventItem[],
  groupPlayerIds: ReadonlySet<string>,
  groupLabel: string
): ArenaGroupCoachInsight | null {
  if (groupPlayerIds.size === 0) return null;
  const pe = filterPlayerCoachEvents(events);
  if (pe.length < 3) return null;
  const last3 = pe.slice(-3);
  const pids = last3.map((e) => e.playerId?.trim()).filter(Boolean) as string[];
  if (new Set(pids).size < 2) return null;
  if (!pids.every((id) => groupPlayerIds.has(id))) return null;
  const neg = last3.every((e) => normSentiment(e.sentiment) === "negative");
  if (!neg) return null;
  const g = groupLabelShort(groupLabel);
  return {
    kind: "GROUP_ALERT",
    priority: 58,
    tts: `По ${g} подряд несколько минусов — проверь темп сегмента.`,
  };
}

/**
 * Мало плотности меток по группе относительно состава.
 */
export function detectGroupBalance(
  events: LiveTrainingEventItem[],
  groupPlayerIds: ReadonlySet<string>,
  groupLabel: string
): ArenaGroupCoachInsight | null {
  if (groupPlayerIds.size < 4) return null;
  const pe = filterPlayerCoachEvents(events);
  const inGroup = pe.filter((e) => e.playerId && groupPlayerIds.has(e.playerId.trim()));
  const n = inGroup.length;
  if (n >= 5) return null;
  if (pe.length >= 10 && n <= 2) {
    const g = groupLabelShort(groupLabel);
    return {
      kind: "GROUP_BALANCE",
      priority: 50,
      tts: `По ${g} пока мало меток на фоне смены — добери фокус по сегменту.`,
    };
  }
  if (pe.length >= 4 && pe.length <= 7 && n === 0) {
    const g = groupLabelShort(groupLabel);
    return {
      kind: "GROUP_BALANCE",
      priority: 49,
      tts: `По ${g} почти нет фиксаций — не потеряй картину по группе.`,
    };
  }
  return null;
}

/** Лучший групповой инсайт (ниже приоритетом, чем player-level в общем массиве). */
export function evaluateGroupCoachInsights(
  events: LiveTrainingEventItem[],
  groupPlayerIds: ReadonlySet<string>,
  groupLabel: string
): ArenaGroupCoachInsight | null {
  const candidates: ArenaGroupCoachInsight[] = [];
  const a = detectGroupAlerts(events, groupPlayerIds, groupLabel);
  if (a) candidates.push(a);
  const f = detectGroupFocus(events, groupPlayerIds, groupLabel);
  if (f) candidates.push(f);
  const b = detectGroupBalance(events, groupPlayerIds, groupLabel);
  if (b) candidates.push(b);
  if (candidates.length === 0) return null;
  candidates.sort((x, y) => y.priority - x.priority);
  return candidates[0] ?? null;
}

export function buildGroupInsightTts(insight: ArenaGroupCoachInsight): string {
  return insight.tts.trim();
}

// --- Review / development (черновики + stress map) ---

export function aggregateGroupTopDomains(
  devAcc: PlayerDevelopmentStressMap,
  groupPlayerIds: ReadonlySet<string>,
  maxDomains: number
): string[] {
  if (groupPlayerIds.size === 0 || maxDomains <= 0) return [];
  const totals: Partial<Record<DevelopmentDomain, number>> = {};
  for (const pid of groupPlayerIds) {
    const row = devAcc[pid];
    if (!row) continue;
    for (const key of Object.keys(row) as DevelopmentDomain[]) {
      const cell = row[key];
      if (!cell) continue;
      totals[key] = (totals[key] ?? 0) + cell.stress;
    }
  }
  const ranked = (Object.entries(totals) as Array<[DevelopmentDomain, number]>)
    .filter(([, v]) => v > 0.04)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxDomains)
    .map(([d]) => DOMAIN_TITLE_RU[d]);
  return ranked;
}

export function buildGroupReviewSummary(input: {
  drafts: LiveTrainingObservationDraft[];
  groupPlayerIds: ReadonlySet<string>;
  groupLabel: string;
}): { summary: string | null; domainsLine: string | null } {
  const { drafts, groupPlayerIds, groupLabel } = input;
  if (groupPlayerIds.size === 0) return { summary: null, domainsLine: null };
  const g = groupLabelShort(groupLabel);
  const withPlayer = drafts.filter((d) => d.playerId?.trim());
  const inGroup = withPlayer.filter((d) => groupPlayerIds.has(d.playerId!.trim()));

  if (withPlayer.length >= 3 && inGroup.length === 0) {
    return {
      summary: `По ${g} мало персональных карточек — имеет смысл больше фиксировать по игрокам сегмента.`,
      domainsLine: null,
    };
  }
  if (inGroup.length === 0) return { summary: null, domainsLine: null };

  const neg = inGroup.filter((d) => d.sentiment === "negative").length;
  const negRatio = inGroup.length > 0 ? neg / inGroup.length : 0;
  if (neg >= 3 && negRatio >= 0.42) {
    return {
      summary: `По ${g} плотнее минусы — держи в голове темп и дисциплину сегмента.`,
      domainsLine: null,
    };
  }
  if (inGroup.length >= Math.max(4, Math.ceil(groupPlayerIds.size * 0.35))) {
    return {
      summary: `Сегодня главный массив наблюдений — ${g}.`,
      domainsLine: null,
    };
  }
  if (inGroup.length <= 2 && drafts.length >= 5) {
    return {
      summary: `По ${g} мало данных в списке — не упусти общую картину сегмента.`,
      domainsLine: null,
    };
  }
  return { summary: null, domainsLine: null };
}

export function buildGroupReviewLayer(input: {
  drafts: LiveTrainingObservationDraft[];
  devAcc: PlayerDevelopmentStressMap;
  groupPlayerIds: ReadonlySet<string>;
  groupLabel: string;
}): { summary: string; domainsLine: string | null } | null {
  const { summary } = buildGroupReviewSummary({
    drafts: input.drafts,
    groupPlayerIds: input.groupPlayerIds,
    groupLabel: input.groupLabel,
  });
  const domains = aggregateGroupTopDomains(input.devAcc, input.groupPlayerIds, 3);
  const domainsLine =
    domains.length > 0 ? `Чаще всплывало: ${domains.join(" · ")}.` : null;

  if (!summary && !domainsLine) return null;
  if (summary && domainsLine) return { summary, domainsLine };
  if (summary) return { summary, domainsLine: null };
  return { summary: domainsLine!, domainsLine: null };
}

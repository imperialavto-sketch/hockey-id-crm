/**
 * Агрегации timeline / trend по окну последних сигналов (без LLM, только счётчики).
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";
import { liveTrainingMetricDomainLabelRu } from "./player-live-training-signals-labels";

export const RECENT_SIGNALS_WINDOW = 30;
export const TIMELINE_SESSION_LIMIT = 5;

export type SignalRowForAggregate = {
  liveTrainingSessionId: string;
  metricDomain: string;
  signalDirection: LiveTrainingObservationSentiment;
  createdAt: Date;
  session: {
    mode: string;
    startedAt: Date;
    endedAt: Date | null;
    confirmedAt: Date | null;
  };
};

export type TrendDomainCountDto = {
  metricDomain: string;
  domainLabelRu: string;
  count: number;
};

export type RepeatedAttentionDto = {
  metricDomain: string;
  domainLabelRu: string;
  negativeCount: number;
};

export type TimelineSessionItemDto = {
  sessionId: string;
  sessionMode: string;
  startedAt: string | null;
  endedAt: string | null;
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topDomains: TrendDomainCountDto[];
  lastSignalAt: string;
};

export type TrendSummaryDto = {
  recentSignalsCount: number;
  recentSessionCount: number;
  dominantPositiveDomains: TrendDomainCountDto[];
  dominantNegativeDomains: TrendDomainCountDto[];
  repeatedAttentionAreas: RepeatedAttentionDto[];
  /** Нет осмысленных паттернов: мало сигналов или одна сессия. */
  insufficientForPatterns: boolean;
};

function sortDomainCounts(
  map: Map<string, number>,
  limit: number
): TrendDomainCountDto[] {
  return [...map.entries()]
    .map(([metricDomain, count]) => ({
      metricDomain,
      domainLabelRu: liveTrainingMetricDomainLabelRu(metricDomain),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildTrendSummaryAndTimeline(
  recentSignals: SignalRowForAggregate[]
): { trendSummary: TrendSummaryDto; timeline: TimelineSessionItemDto[] } {
  const recentSignalsCount = recentSignals.length;
  const sessionIds = new Set(recentSignals.map((s) => s.liveTrainingSessionId));
  const recentSessionCount = sessionIds.size;

  const insufficientForPatterns = recentSessionCount < 2 || recentSignalsCount < 4;

  const posByDomain = new Map<string, number>();
  const negByDomain = new Map<string, number>();
  const negCountByDomain = new Map<string, number>();

  for (const s of recentSignals) {
    if (s.signalDirection === "positive") {
      posByDomain.set(s.metricDomain, (posByDomain.get(s.metricDomain) ?? 0) + 1);
    } else if (s.signalDirection === "negative") {
      negByDomain.set(s.metricDomain, (negByDomain.get(s.metricDomain) ?? 0) + 1);
      negCountByDomain.set(s.metricDomain, (negCountByDomain.get(s.metricDomain) ?? 0) + 1);
    }
  }

  const dominantPositiveDomains = sortDomainCounts(posByDomain, 3);
  const dominantNegativeDomains = sortDomainCounts(negByDomain, 3);

  const repeatedAttentionAreas: RepeatedAttentionDto[] = [...negCountByDomain.entries()]
    .filter(([, c]) => c >= 2)
    .map(([metricDomain, negativeCount]) => ({
      metricDomain,
      domainLabelRu: liveTrainingMetricDomainLabelRu(metricDomain),
      negativeCount,
    }))
    .sort((a, b) => b.negativeCount - a.negativeCount)
    .slice(0, 4);

  const bySession = new Map<
    string,
    {
      session: SignalRowForAggregate["session"];
      signals: SignalRowForAggregate[];
      lastAt: Date;
    }
  >();

  for (const s of recentSignals) {
    const sid = s.liveTrainingSessionId;
    const cur = bySession.get(sid);
    if (!cur) {
      bySession.set(sid, {
        session: s.session,
        signals: [s],
        lastAt: s.createdAt,
      });
    } else {
      cur.signals.push(s);
      if (s.createdAt > cur.lastAt) cur.lastAt = s.createdAt;
    }
  }

  const timelineSessions: TimelineSessionItemDto[] = [...bySession.entries()]
    .map(([sessionId, pack]) => {
      let positiveCount = 0;
      let negativeCount = 0;
      let neutralCount = 0;
      const domMap = new Map<string, number>();
      for (const sig of pack.signals) {
        if (sig.signalDirection === "positive") positiveCount += 1;
        else if (sig.signalDirection === "negative") negativeCount += 1;
        else neutralCount += 1;
        domMap.set(sig.metricDomain, (domMap.get(sig.metricDomain) ?? 0) + 1);
      }
      const topDomains = sortDomainCounts(domMap, 3);
      return {
        sessionId,
        sessionMode: pack.session.mode,
        startedAt: pack.session.startedAt.toISOString(),
        endedAt: pack.session.endedAt?.toISOString() ?? null,
        totalSignals: pack.signals.length,
        positiveCount,
        negativeCount,
        neutralCount,
        topDomains,
        lastSignalAt: pack.lastAt.toISOString(),
        _sortKey: pack.lastAt.getTime(),
      };
    })
    .sort((a, b) => b._sortKey - a._sortKey)
    .slice(0, TIMELINE_SESSION_LIMIT)
    .map(
      ({
        sessionId,
        sessionMode,
        startedAt,
        endedAt,
        totalSignals,
        positiveCount,
        negativeCount,
        neutralCount,
        topDomains,
        lastSignalAt,
      }) => ({
        sessionId,
        sessionMode,
        startedAt,
        endedAt,
        totalSignals,
        positiveCount,
        negativeCount,
        neutralCount,
        topDomains,
        lastSignalAt,
      })
    );

  return {
    trendSummary: {
      recentSignalsCount,
      recentSessionCount,
      dominantPositiveDomains,
      dominantNegativeDomains,
      repeatedAttentionAreas,
      insufficientForPatterns,
    },
    timeline: timelineSessions,
  };
}

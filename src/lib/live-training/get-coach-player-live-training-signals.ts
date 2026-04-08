/**
 * Read-model для coach-app: сигналы живой тренировки по игроку + timeline / trend (окно последних сигналов).
 */

import type { LiveTrainingObservationSentiment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  liveTrainingMetricDomainLabelRu,
  liveTrainingMetricKeyLabelRu,
  liveTrainingSignalDirectionLabelRu,
} from "./player-live-training-signals-labels";
import {
  buildTrendSummaryAndTimeline,
  RECENT_SIGNALS_WINDOW,
  type TrendSummaryDto,
  type TimelineSessionItemDto,
} from "./player-live-training-signals-aggregate";

const LATEST_UI_LIMIT = 3;

/** Roll-up of recent-window signals by metricDomain + metricKey (for coach domain evidence UI). */
export type PlayerLiveTrainingRecentEvidenceSliceDto = {
  metricDomain: string;
  metricKey: string;
  signalCount: number;
  positiveCount: number;
  negativeCount: number;
  lastSignalAt: string;
};

function buildRecentEvidenceSlices(
  recentRows: Array<{
    metricDomain: string;
    metricKey: string;
    signalDirection: LiveTrainingObservationSentiment;
    createdAt: Date;
  }>
): PlayerLiveTrainingRecentEvidenceSliceDto[] {
  const map = new Map<
    string,
    {
      metricDomain: string;
      metricKey: string;
      signalCount: number;
      positiveCount: number;
      negativeCount: number;
      lastAt: Date;
    }
  >();

  for (const r of recentRows) {
    const k = `${r.metricDomain}\0${r.metricKey}`;
    let cur = map.get(k);
    if (!cur) {
      cur = {
        metricDomain: r.metricDomain,
        metricKey: r.metricKey,
        signalCount: 0,
        positiveCount: 0,
        negativeCount: 0,
        lastAt: r.createdAt,
      };
      map.set(k, cur);
    }
    cur.signalCount += 1;
    if (r.signalDirection === "positive") cur.positiveCount += 1;
    if (r.signalDirection === "negative") cur.negativeCount += 1;
    if (r.createdAt > cur.lastAt) cur.lastAt = r.createdAt;
  }

  return [...map.values()].map((v) => ({
    metricDomain: v.metricDomain,
    metricKey: v.metricKey,
    signalCount: v.signalCount,
    positiveCount: v.positiveCount,
    negativeCount: v.negativeCount,
    lastSignalAt: v.lastAt.toISOString(),
  }));
}

export type PlayerLiveTrainingSignalItemDto = {
  id: string;
  liveTrainingSessionId: string;
  sessionMode: string;
  sessionStartedAt: string | null;
  sessionConfirmedAt: string | null;
  createdAt: string;
  evidenceText: string;
  metricDomain: string;
  metricKey: string;
  signalDirection: LiveTrainingObservationSentiment;
  domainLabelRu: string;
  topicLabelRu: string;
  directionLabelRu: string;
};

export type PlayerLiveTrainingSignalsDomainBucketDto = {
  metricDomain: string;
  domainLabelRu: string;
  count: number;
};

export type PlayerLiveTrainingSignalsSummaryDto = {
  totalSignals: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  lastSignalAt: string | null;
  lastSessionId: string | null;
  domainBuckets: PlayerLiveTrainingSignalsDomainBucketDto[];
};

export type PlayerLiveTrainingSignalsBundleDto = {
  summary: PlayerLiveTrainingSignalsSummaryDto;
  trendSummary: TrendSummaryDto;
  timeline: TimelineSessionItemDto[];
  latestSignals: PlayerLiveTrainingSignalItemDto[];
  /** Max signals scanned for slices (same window as trend timeline). */
  recentEvidenceWindowMaxSignals: number;
  /** Per (metricDomain, metricKey) within the recent window — additive for coach development evidence. */
  recentEvidenceSlices: PlayerLiveTrainingRecentEvidenceSliceDto[];
};

function mapRowToItem(row: {
  id: string;
  liveTrainingSessionId: string;
  metricDomain: string;
  metricKey: string;
  signalDirection: LiveTrainingObservationSentiment;
  evidenceText: string;
  createdAt: Date;
  session: {
    mode: string;
    startedAt: Date;
    confirmedAt: Date | null;
  };
}): PlayerLiveTrainingSignalItemDto {
  return {
    id: row.id,
    liveTrainingSessionId: row.liveTrainingSessionId,
    sessionMode: row.session.mode,
    sessionStartedAt: row.session.startedAt.toISOString(),
    sessionConfirmedAt: row.session.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    evidenceText: row.evidenceText,
    metricDomain: row.metricDomain,
    metricKey: row.metricKey,
    signalDirection: row.signalDirection,
    domainLabelRu: liveTrainingMetricDomainLabelRu(row.metricDomain),
    topicLabelRu: liveTrainingMetricKeyLabelRu(row.metricKey),
    directionLabelRu: liveTrainingSignalDirectionLabelRu(row.signalDirection),
  };
}

export async function getPlayerLiveTrainingSignalsBundle(
  playerId: string
): Promise<PlayerLiveTrainingSignalsBundleDto> {
  const [totalSignals, directionGroups, domainGroups, lastRow, recentRows] = await Promise.all([
    prisma.liveTrainingPlayerSignal.count({ where: { playerId } }),
    prisma.liveTrainingPlayerSignal.groupBy({
      by: ["signalDirection"],
      where: { playerId },
      _count: { _all: true },
    }),
    prisma.liveTrainingPlayerSignal.groupBy({
      by: ["metricDomain"],
      where: { playerId },
      _count: { _all: true },
    }),
    prisma.liveTrainingPlayerSignal.findFirst({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, liveTrainingSessionId: true },
    }),
    prisma.liveTrainingPlayerSignal.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      take: RECENT_SIGNALS_WINDOW,
      include: {
        LiveTrainingSession: {
          select: {
            mode: true,
            startedAt: true,
            endedAt: true,
            confirmedAt: true,
          },
        },
      },
    }),
  ]);

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  for (const g of directionGroups) {
    const c = g._count._all;
    if (g.signalDirection === "positive") positiveCount = c;
    else if (g.signalDirection === "negative") negativeCount = c;
    else neutralCount = c;
  }

  const domainBuckets: PlayerLiveTrainingSignalsDomainBucketDto[] = domainGroups
    .map((g) => ({
      metricDomain: g.metricDomain,
      domainLabelRu: liveTrainingMetricDomainLabelRu(g.metricDomain),
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const forAgg = recentRows.map((r) => ({
    liveTrainingSessionId: r.liveTrainingSessionId,
    metricDomain: r.metricDomain,
    signalDirection: r.signalDirection,
    createdAt: r.createdAt,
    session: r.LiveTrainingSession,
  }));

  const { trendSummary, timeline } = buildTrendSummaryAndTimeline(forAgg);

  const latestSignals = recentRows.slice(0, LATEST_UI_LIMIT).map((r) =>
    mapRowToItem({
      id: r.id,
      liveTrainingSessionId: r.liveTrainingSessionId,
      metricDomain: r.metricDomain,
      metricKey: r.metricKey,
      signalDirection: r.signalDirection,
      evidenceText: r.evidenceText,
      createdAt: r.createdAt,
      session: r.LiveTrainingSession,
    })
  );

  return {
    summary: {
      totalSignals,
      positiveCount,
      negativeCount,
      neutralCount,
      lastSignalAt: lastRow?.createdAt.toISOString() ?? null,
      lastSessionId: lastRow?.liveTrainingSessionId ?? null,
      domainBuckets,
    },
    trendSummary,
    timeline,
    latestSignals,
    recentEvidenceWindowMaxSignals: RECENT_SIGNALS_WINDOW,
    recentEvidenceSlices: buildRecentEvidenceSlices(
      recentRows.map((r) => ({
        metricDomain: r.metricDomain,
        metricKey: r.metricKey,
        signalDirection: r.signalDirection,
        createdAt: r.createdAt,
      }))
    ),
  };
}

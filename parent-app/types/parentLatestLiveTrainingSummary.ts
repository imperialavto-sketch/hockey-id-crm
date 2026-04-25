/**
 * Wire shape for GET /api/parent/players/[id]/latest-training-summary
 * (see `src/lib/live-training/parent-latest-live-training-summary.ts` — ParentLatestLiveTrainingSummaryDto).
 */

import { parseArenaParentGuidance } from "@/types/arenaParentGuidance";
import { parseArenaParentSummary } from "@/types/arenaParentSummary";
import type { ArenaParentGuidance } from "@/types/arenaParentGuidance";
import type { ArenaParentSummary } from "@/types/arenaParentSummary";

export type ParentLatestLiveTrainingSummaryDto =
  | { hasData: false }
  | {
      hasData: true;
      source: "published" | "live_session_fallback";
      isPublished: boolean;
      sessionMeta: {
        teamLabel: string;
        modeLabel: string;
        dateLabel: string;
      };
      counters: {
        totalSignals: number;
        positiveCount: number;
        negativeCount: number;
        neutralCount: number;
      };
      highlights: string[];
      developmentFocus: string[];
      supportNotes: string[];
      shortSummary: string;
      arenaSummary?: unknown;
      arenaGuidance?: unknown;
    };

export type ParentLiveTrainingHeroPayload = {
  summary: ArenaParentSummary | null;
  guidance: ArenaParentGuidance | null;
  fallbackLine: string | null;
  /**
   * Короткая подпись происхождения сводки (из DTO `source` / `isPublished`), только когда есть текст для героя.
   */
  provenanceLine: string | null;
};

function numField(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}

function stringArrayField(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((v): v is string => typeof v === "string");
}

/**
 * Validates minimal contract for `hasData: true`. Returns null if the payload is not a valid summary object.
 */
export function parseParentLatestLiveTrainingSummaryDto(
  raw: unknown
): ParentLatestLiveTrainingSummaryDto | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.hasData === false) return { hasData: false };
  if (o.hasData !== true) return null;

  const sessionMeta = o.sessionMeta;
  if (!sessionMeta || typeof sessionMeta !== "object" || Array.isArray(sessionMeta)) return null;
  const sm = sessionMeta as Record<string, unknown>;
  if (
    typeof sm.teamLabel !== "string" ||
    typeof sm.modeLabel !== "string" ||
    typeof sm.dateLabel !== "string"
  ) {
    return null;
  }

  const counters = o.counters;
  if (!counters || typeof counters !== "object" || Array.isArray(counters)) return null;
  const c = counters as Record<string, unknown>;

  const source =
    o.source === "live_session_fallback" ? ("live_session_fallback" as const) : ("published" as const);

  return {
    hasData: true,
    source,
    isPublished: Boolean(o.isPublished),
    sessionMeta: {
      teamLabel: sm.teamLabel,
      modeLabel: sm.modeLabel,
      dateLabel: sm.dateLabel,
    },
    counters: {
      totalSignals: numField(c.totalSignals),
      positiveCount: numField(c.positiveCount),
      negativeCount: numField(c.negativeCount),
      neutralCount: numField(c.neutralCount),
    },
    highlights: stringArrayField(o.highlights),
    developmentFocus: stringArrayField(o.developmentFocus),
    supportNotes: stringArrayField(o.supportNotes),
    shortSummary: typeof o.shortSummary === "string" ? o.shortSummary : "",
    arenaSummary: o.arenaSummary,
    arenaGuidance: o.arenaGuidance,
  };
}

export function parentLatestTrainingDtoToHeroPayload(
  dto: ParentLatestLiveTrainingSummaryDto
): ParentLiveTrainingHeroPayload {
  if (dto.hasData !== true) {
    return { summary: null, guidance: null, fallbackLine: null, provenanceLine: null };
  }
  const summary = parseArenaParentSummary(dto.arenaSummary);
  const guidance = parseArenaParentGuidance(dto.arenaGuidance);
  const short = dto.shortSummary.trim();
  const fallbackLine = !summary && !guidance && short ? short : null;
  const hasHeroContent = Boolean(summary || guidance || fallbackLine);
  const provenanceLine =
    hasHeroContent && dto.source === "live_session_fallback"
      ? "По последней live-сессии в приложении"
      : hasHeroContent
        ? "По опубликованному отчёту"
        : null;
  return { summary, guidance, fallbackLine, provenanceLine };
}

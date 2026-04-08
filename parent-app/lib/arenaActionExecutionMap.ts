/**
 * Phase 3C.3–3C.4 — map Arena quick-action analytics keys to deep navigation, hub screen, or prompt.
 * Uses only `CoachMarkPlayerContext` / playerId (no new API calls; ids pass-through from existing aggregates).
 */

import type { Href } from "expo-router";
import type { CoachMarkPlayerContext } from "@/services/chatService";

export type ArenaExecutionContext = {
  playerId: string | null;
  playerContext: CoachMarkPlayerContext | null;
};

/** deep-navigation → most specific safe target; screen-navigation → hub / secondary screen; prompt → send text */
export type ArenaExecutionResult =
  | { kind: "deep-navigation"; href: Href }
  | { kind: "screen-navigation"; href: Href }
  | { kind: "prompt" };

function hasEvaluationSignal(pc: CoachMarkPlayerContext | null): boolean {
  const e = pc?.latestSessionEvaluation;
  if (!e) return false;
  return (
    typeof e.effort === "number" ||
    typeof e.focus === "number" ||
    typeof e.discipline === "number" ||
    Boolean(e.note && e.note.trim())
  );
}

function hasReportText(pc: CoachMarkPlayerContext | null): boolean {
  const r = pc?.latestSessionReport;
  if (!r) return false;
  return Boolean(
    (r.summary && r.summary.trim()) ||
      (r.focusAreas && r.focusAreas.trim()) ||
      (r.parentMessage && r.parentMessage.trim())
  );
}

function hasLiveSummary(pc: CoachMarkPlayerContext | null): boolean {
  const l = pc?.latestLiveTrainingSummary;
  if (!l) return false;
  return Boolean(
    (l.shortSummary && l.shortSummary.trim()) ||
      (Array.isArray(l.highlights) && l.highlights.length > 0) ||
      (Array.isArray(l.developmentFocus) && l.developmentFocus.length > 0)
  );
}

/** Enough “last training / session” signal to open a training-related surface. */
export function hasArenaTrainingNavigationContext(pc: CoachMarkPlayerContext | null): boolean {
  return hasEvaluationSignal(pc) || hasReportText(pc) || hasLiveSummary(pc);
}

function hasAiGrowthContext(pc: CoachMarkPlayerContext | null): boolean {
  const a = pc?.aiAnalysis;
  if (!a) return false;
  return Boolean(
    (a.summary && a.summary.trim()) ||
      (Array.isArray(a.growthAreas) && a.growthAreas.some((x) => x && String(x).trim()))
  );
}

function hasStoryTrend(pc: CoachMarkPlayerContext | null): boolean {
  const s = pc?.playerStory;
  return Boolean(s?.trendItems?.some((t) => t && String(t).trim()));
}

function hasOtherGrowthSignals(pc: CoachMarkPlayerContext | null): boolean {
  const es = pc?.evaluationSummary;
  const att = pc?.attendanceSummary;
  return Boolean(
    (es && es.totalEvaluations > 0) ||
      (att && typeof att.totalSessions === "number" && att.totalSessions > 0) ||
      hasStoryTrend(pc)
  );
}

function hrefPlayerProfile(pid: string): Href {
  return `/player/${encodeURIComponent(pid)}` as Href;
}

function hrefCoachMaterialsHub(pid: string): Href {
  return `/player/${encodeURIComponent(pid)}/coach-materials` as Href;
}

function hrefAiAnalysis(pid: string): Href {
  return `/player/${encodeURIComponent(pid)}/ai-analysis` as Href;
}

/**
 * Non-empty session anchor from data already on context (published report trainingId, else live summary id).
 * Not used for CRM report ids (different namespace than `/coach-materials/report/[id]`).
 */
export function reliableArenaSessionAnchor(pc: CoachMarkPlayerContext | null): string | null {
  if (!pc) return null;
  const fromReport = pc.latestSessionReport?.trainingId?.trim();
  if (fromReport) return fromReport;
  const fromLive = pc.latestLiveTrainingSummary?.trainingSessionId?.trim();
  if (fromLive) return fromLive;
  return null;
}

/**
 * Decide deep vs screen vs prompt for a quick-action `analyticsKey` (same as chip / matcher keys).
 *
 * Fallback order per action: deep-navigation → screen-navigation → prompt.
 */
export function resolveArenaQuickActionExecution(
  analyticsKey: string,
  ctx: ArenaExecutionContext
): ArenaExecutionResult {
  const pid = ctx.playerId?.trim() || null;
  const pc = ctx.playerContext;

  switch (analyticsKey) {
    case "insight_followup_last_training":
    case "analyze_last_training": {
      if (!pid || !hasArenaTrainingNavigationContext(pc)) {
        return { kind: "prompt" };
      }
      if (reliableArenaSessionAnchor(pc)) {
        return { kind: "deep-navigation", href: hrefPlayerProfile(pid) };
      }
      return { kind: "screen-navigation", href: hrefCoachMaterialsHub(pid) };
    }

    case "coach_report_plain": {
      if (!pid || !hasReportText(pc)) {
        return { kind: "prompt" };
      }
      const publishedTrainingId = pc?.latestSessionReport?.trainingId?.trim();
      if (publishedTrainingId) {
        return { kind: "deep-navigation", href: hrefPlayerProfile(pid) };
      }
      return { kind: "screen-navigation", href: hrefCoachMaterialsHub(pid) };
    }

    case "insight_followup_meaning_growth": {
      if (!pid) return { kind: "prompt" };
      if (hasAiGrowthContext(pc)) {
        return { kind: "deep-navigation", href: hrefAiAnalysis(pid) };
      }
      if (hasOtherGrowthSignals(pc)) {
        return { kind: "screen-navigation", href: hrefPlayerProfile(pid) };
      }
      return { kind: "prompt" };
    }

    default:
      return { kind: "prompt" };
  }
}

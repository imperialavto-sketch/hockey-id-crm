/**
 * Coach Home Priorities — aggregates top actions from existing helpers.
 * No backend, no new libraries.
 */

import { getCoachActionItems, type CoachActionItem } from "./coachActionHelpers";
import { getWeeklyReadyReports, type WeeklyReportItem } from "./weeklyReportHelpers";
import { getParentDrafts, type ParentDraftItem } from "./parentDraftHelpers";
import { loadSessionReviewSummary } from "./sessionReviewCenterHelpers";
import { buildSessionFollowUpItems } from "./sessionFollowUpHelpers";

export type CoachHomePriorityType =
  | "player_attention"
  | "report_ready"
  | "parent_draft"
  | "session_followup";

export interface CoachHomePriorityItem {
  type: CoachHomePriorityType;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaRoute: string;
  playerId: string;
}

const MAX_ITEMS = 4;

/** Priority order for display: action/follow-up first, then parent drafts, then reports */
const TYPE_ORDER: Record<CoachHomePriorityType, number> = {
  player_attention: 0,
  session_followup: 1,
  parent_draft: 2,
  report_ready: 3,
};

function toActionPriority(item: CoachActionItem): CoachHomePriorityItem {
  return {
    type: "player_attention",
    title: item.playerName,
    subtitle: item.actionLine,
    ctaLabel: "Открыть",
    ctaRoute: `/player/${item.playerId}`,
    playerId: item.playerId,
  };
}

function toReportPriority(item: WeeklyReportItem): CoachHomePriorityItem {
  return {
    type: "report_ready",
    title: item.playerName,
    subtitle: item.summary,
    ctaLabel: "Открыть",
    ctaRoute: `/player/${item.playerId}/report`,
    playerId: item.playerId,
  };
}

function toParentDraftPriority(item: ParentDraftItem): CoachHomePriorityItem {
  const pid = item.playerId ?? "";
  return {
    type: "parent_draft",
    title: item.playerName,
    subtitle: item.preview,
    ctaLabel: "Сообщение",
    ctaRoute: `/player/${pid}/share-report`,
    playerId: pid,
  };
}

function toFollowUpPriority(item: {
  playerId: string;
  playerName: string;
  reasonLine: string;
  ctaLabel: string;
  ctaRoute: string;
}): CoachHomePriorityItem {
  return {
    type: "session_followup",
    title: item.playerName,
    subtitle: item.reasonLine,
    ctaLabel: item.ctaLabel,
    ctaRoute: item.ctaRoute,
    playerId: item.playerId,
  };
}

/**
 * Collect 3–5 priority items from all sources.
 * Order: action/follow-up → parent drafts → reports.
 * Deduplicate by player: keep the most useful type.
 */
export async function getCoachHomePriorities(): Promise<CoachHomePriorityItem[]> {
  let drafts: Awaited<ReturnType<typeof getParentDrafts>> = [];
  let reports: WeeklyReportItem[] = [];
  let actions: CoachActionItem[] = [];
  try {
    drafts = await getParentDrafts();
  } catch {
    /* fallback to [] when API unavailable */
  }
  try {
    reports = await getWeeklyReadyReports();
  } catch {
    /* fallback to [] when API unavailable */
  }
  try {
    actions = await getCoachActionItems();
  } catch {
    /* fallback to [] when API unavailable */
  }
  const [reviewSummary] = await Promise.all([loadSessionReviewSummary()]);

  const followUps = buildSessionFollowUpItems(reviewSummary.session, reviewSummary.players);

  const byPlayer = new Map<string, CoachHomePriorityItem>();

  for (const item of actions) {
    byPlayer.set(item.playerId, toActionPriority(item));
  }

  for (const item of followUps) {
    const existing = byPlayer.get(item.playerId);
    if (!existing || TYPE_ORDER[existing.type] > TYPE_ORDER.session_followup) {
      byPlayer.set(item.playerId, toFollowUpPriority(item));
    }
  }

  for (const item of drafts) {
    if (!item.playerId) continue;
    const existing = byPlayer.get(item.playerId);
    if (!existing || TYPE_ORDER[existing.type] > TYPE_ORDER.parent_draft) {
      byPlayer.set(item.playerId, toParentDraftPriority(item));
    }
  }

  for (const item of reports) {
    if (!byPlayer.has(item.playerId)) {
      byPlayer.set(item.playerId, toReportPriority(item));
    }
  }

  const all = Array.from(byPlayer.values());
  all.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
  return all.slice(0, MAX_ITEMS);
}

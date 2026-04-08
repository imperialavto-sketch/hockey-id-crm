/**
 * Team announcements (TeamFeedPost) for parent mobile — read-only channel.
 */

import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";
import { isDemoMode } from "@/config/api";
import type {
  TeamAnnouncementDto,
  TeamAnnouncementsInboxSummary,
  TeamAnnouncementChoice,
} from "@/types/teamAnnouncement";

const PARENT_ID_HEADER = "x-parent-id";

function headers(parentId: string): Record<string, string> {
  return { [PARENT_ID_HEADER]: parentId };
}

function buildAnnouncementsQuery(opts?: {
  playerId?: string | null;
  teamId?: string | null;
}): string {
  const params = new URLSearchParams();
  const p = opts?.playerId?.trim();
  const t = opts?.teamId?.trim();
  if (p) params.set("playerId", p);
  if (t) params.set("teamId", t);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function getTeamAnnouncementsInboxSummary(
  parentId: string
): Promise<TeamAnnouncementsInboxSummary> {
  if (isDemoMode) {
    return {
      status: "no_channel",
      reason: "error",
    };
  }
  try {
    const data = await apiFetch<{
      ok?: boolean;
      reason?: string;
      channels?: Array<{
        teamId: string;
        teamName: string;
        anchorPlayerId: string;
        playersLabel: string;
        preview: string;
        updatedAt: string;
        unreadCount: number;
      }>;
    }>(`/api/parent/mobile/team/announcements?summary=1`, {
      headers: headers(parentId),
      timeoutMs: 12000,
    });

    if (data && data.ok === false) {
      const r = data.reason;
      if (r === "no_players" || r === "no_team") {
        return { status: "no_channel", reason: r };
      }
      return { status: "no_channel", reason: "error" };
    }

    if (!data?.ok || !Array.isArray(data.channels)) {
      return { status: "no_channel", reason: "error" };
    }

    if (data.channels.length === 0) {
      return { status: "no_channel", reason: "no_team" };
    }

    return {
      status: "ready",
      channels: data.channels.map((c) => ({
        teamId: c.teamId,
        teamName: c.teamName,
        anchorPlayerId: c.anchorPlayerId,
        playersLabel: c.playersLabel,
        preview: typeof c.preview === "string" ? c.preview : "",
        updatedAt: c.updatedAt,
        unreadCount: typeof c.unreadCount === "number" ? c.unreadCount : 0,
      })),
    };
  } catch (e) {
    logApiError("teamAnnouncementsService.getTeamAnnouncementsInboxSummary", e);
    return { status: "no_channel", reason: "error" };
  }
}

export type GetTeamAnnouncementsResult = {
  ok: boolean;
  /** Нужен выбор команды (несколько детей в разных командах, не передан контекст). */
  needsTeamChoice?: boolean;
  choices?: TeamAnnouncementChoice[];
  team: { id: string; name: string } | null;
  announcements: TeamAnnouncementDto[];
  unreadCount: number;
  multipleTeamsWarning: string | null;
  lastReadAt: string | null;
};

export async function getTeamAnnouncements(
  parentId: string,
  opts?: { playerId?: string | null; teamId?: string | null }
): Promise<GetTeamAnnouncementsResult> {
  if (isDemoMode) {
    return {
      ok: true,
      team: null,
      announcements: [],
      unreadCount: 0,
      multipleTeamsWarning: null,
      lastReadAt: null,
    };
  }
  try {
    const q = buildAnnouncementsQuery(opts);
    const data = await apiFetch<{
      ok?: boolean;
      reason?: string;
      choices?: TeamAnnouncementChoice[];
      team?: { id: string; name: string };
      announcements?: TeamAnnouncementDto[];
      unreadCount?: number;
      multipleTeamsWarning?: string | null;
      lastReadAt?: string | null;
    }>(`/api/parent/mobile/team/announcements${q}`, {
      headers: headers(parentId),
      timeoutMs: 12000,
    });

    if (data?.ok === false && data.reason === "multi_team_choice_required") {
      return {
        ok: true,
        needsTeamChoice: true,
        choices: Array.isArray(data.choices) ? data.choices : [],
        team: null,
        announcements: [],
        unreadCount: 0,
        multipleTeamsWarning: null,
        lastReadAt: null,
      };
    }

    const empty = {
      ok: true as const,
      team: null,
      announcements: [] as TeamAnnouncementDto[],
      unreadCount: 0,
      multipleTeamsWarning: null as string | null,
      lastReadAt: null as string | null,
    };

    if (data && data.ok === false) {
      return empty;
    }

    if (!data?.team?.id) {
      return empty;
    }

    return {
      ok: true,
      team: data.team,
      announcements: Array.isArray(data.announcements) ? data.announcements : [],
      unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
      multipleTeamsWarning: data.multipleTeamsWarning ?? null,
      lastReadAt: data.lastReadAt ?? null,
    };
  } catch (e) {
    logApiError("teamAnnouncementsService.getTeamAnnouncements", e);
    return {
      ok: false,
      team: null,
      announcements: [],
      unreadCount: 0,
      multipleTeamsWarning: null,
      lastReadAt: null,
    };
  }
}

export async function markTeamAnnouncementsRead(
  parentId: string,
  opts: { teamId?: string; playerId?: string | null }
): Promise<boolean> {
  if (isDemoMode) return true;
  try {
    await apiFetch(`/api/parent/mobile/team/announcements/read`, {
      method: "POST",
      headers: headers(parentId),
      body: JSON.stringify({
        teamId: opts.teamId,
        playerId: opts.playerId ?? undefined,
      }),
      timeoutMs: 8000,
    });
    return true;
  } catch (e) {
    logApiError("teamAnnouncementsService.markTeamAnnouncementsRead", e);
    return false;
  }
}

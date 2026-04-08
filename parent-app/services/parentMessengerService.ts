/**
 * Родительский messenger: команды, родители команды, каналы.
 *
 * PHASE 3: Uses `/api/parent/*` helpers to resolve team **ChatConversation** ids for canonical messaging (`PARENT_CANONICAL_CHAT_FLOW`).
 * Not the same as `teamService` stub `/api/team/messages`. See `docs/PHASE_3_APP_FLOW_LOCK.md`.
 * PHASE 4: Canonical **human chat** resolution vs **`STUB_TEAM_MESSAGES_SURFACE`** — `docs/PHASE_4_DEAD_PATH_ISOLATION.md`, `isolationContours.ts`.
 */

import { apiFetch } from "@/lib/api";
import { logApiError } from "@/lib/apiErrors";

const PARENT_ID_HEADER = "x-parent-id";

function headers(parentId: string): Record<string, string> {
  return { [PARENT_ID_HEADER]: parentId, "Content-Type": "application/json" };
}

export type ParentTeamSummary = { id: string; name: string; ageGroup: string };

export async function fetchParentTeams(
  parentId: string
): Promise<ParentTeamSummary[]> {
  try {
    const data = await apiFetch<{ teams?: ParentTeamSummary[] }>(
      "/api/parent/teams",
      { headers: headers(parentId), timeoutMs: 12000 }
    );
    return Array.isArray(data?.teams) ? data.teams : [];
  } catch (e) {
    logApiError("parentMessengerService.fetchParentTeams", e);
    return [];
  }
}

export type TeamParentMemberRow = {
  parentId: string;
  displayName: string;
  relationLabel: string | null;
  childrenInTeam: Array<{ name: string; relation: string | null }>;
  isSelf: boolean;
  canMessage: boolean;
  existingConversationId: string | null;
};

export async function fetchTeamParentsList(
  parentId: string,
  teamId: string
): Promise<{
  team: { id: string; name: string; ageGroup: string };
  members: TeamParentMemberRow[];
} | null> {
  try {
    const data = await apiFetch<{
      ok?: boolean;
      team?: { id: string; name: string; ageGroup: string };
      members?: TeamParentMemberRow[];
    }>(`/api/parent/teams/${encodeURIComponent(teamId)}/parents`, {
      headers: headers(parentId),
      timeoutMs: 15000,
    });
    if (!data?.team || !Array.isArray(data.members)) return null;
    return { team: data.team, members: data.members };
  } catch (e) {
    logApiError("parentMessengerService.fetchTeamParentsList", e);
    return null;
  }
}

export async function postParentDirectOpen(
  parentId: string,
  otherParentId: string,
  teamId: string
): Promise<{ conversationId: string } | null> {
  try {
    const data = await apiFetch<{
      ok?: boolean;
      conversationId?: string;
    }>("/api/parent/messages/direct", {
      method: "POST",
      headers: headers(parentId),
      body: JSON.stringify({ otherParentId, teamId }),
      timeoutMs: 15000,
    });
    if (!data?.conversationId) return null;
    return { conversationId: data.conversationId };
  } catch (e) {
    logApiError("parentMessengerService.postParentDirectOpen", e);
    return null;
  }
}

export async function fetchTeamParentChannelId(
  parentId: string,
  teamId: string
): Promise<string | null> {
  try {
    const data = await apiFetch<{ conversationId?: string }>(
      `/api/parent/teams/${encodeURIComponent(teamId)}/parent-channel`,
      { headers: headers(parentId), timeoutMs: 12000 }
    );
    return typeof data?.conversationId === "string" ? data.conversationId : null;
  } catch (e) {
    logApiError("parentMessengerService.fetchTeamParentChannelId", e);
    return null;
  }
}

export async function fetchTeamAnnouncementChannelId(
  parentId: string,
  teamId: string
): Promise<string | null> {
  try {
    const data = await apiFetch<{ conversationId?: string }>(
      `/api/parent/teams/${encodeURIComponent(teamId)}/announcement-channel`,
      { headers: headers(parentId), timeoutMs: 12000 }
    );
    return typeof data?.conversationId === "string" ? data.conversationId : null;
  } catch (e) {
    logApiError("parentMessengerService.fetchTeamAnnouncementChannelId", e);
    return null;
  }
}

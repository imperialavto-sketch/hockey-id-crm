/**
 * Resolve which team’s announcements a parent may see (players → team).
 * Explicit teamId or playerId required when children are on multiple teams.
 */

import { prisma } from "@/lib/prisma";
import { canParentAccessPlayer, canParentAccessTeam } from "@/lib/parent-access";

function announcementTiming(
  scope: string,
  phase: string,
  extra?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[api.timing] parent-team-announcements ${scope}`, phase, extra);
}

export type ResolveParentTeamAnnouncementsInput = {
  playerId?: string | null;
  teamId?: string | null;
};

/** One team the parent can open for announcements (picker row). */
export type ParentAnnouncementTeamChoice = {
  teamId: string;
  teamName: string;
  playerIds: string[];
  playersLabel: string;
};

export type ParentTeamResolution =
  | {
      ok: true;
      teamId: string;
      teamName: string;
      /** @deprecated всегда null — не полагаемся на «тихий» выбор */
      multipleTeamsWarning: null;
      playerIdUsed: string | null;
    }
  | {
      ok: false;
      reason:
        | "no_players"
        | "no_team"
        | "forbidden_player"
        | "forbidden_team"
        | "multi_team_choice_required";
      choices?: ParentAnnouncementTeamChoice[];
    };

export type ParentAnnouncementChannelInbox = {
  teamId: string;
  teamName: string;
  anchorPlayerId: string;
  playersLabel: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
};

function buildPlayersShortLabel(
  players: { firstName: string; lastName: string }[]
): string {
  if (players.length === 0) return "";
  if (players.length === 1) {
    const p = players[0]!;
    return `${p.firstName} ${p.lastName}`.trim();
  }
  if (players.length === 2) {
    return `${players[0]!.firstName} и ${players[1]!.firstName}`;
  }
  return `${players[0]!.firstName}, ${players[1]!.firstName} и ещё ${players.length - 2}`;
}

async function loadParentPlayersWithTeamsFixed(parentId: string) {
  return prisma.player.findMany({
    where: {
      parentPlayers: { some: { parentId } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      teamId: true,
      team: { select: { id: true, name: true } },
    },
  });
}

/** Список команд родителя с подписью детей (для picker и inbox). */
export async function listParentAnnouncementTeamChoices(
  parentId: string
): Promise<ParentAnnouncementTeamChoice[]> {
  const players = await loadParentPlayersWithTeamsFixed(parentId);
  const withTeam = players.filter((p): p is typeof p & { teamId: string } =>
    Boolean(p.teamId)
  );
  if (withTeam.length === 0) return [];

  const byTeam = new Map<
    string,
    { teamName: string; players: { id: string; firstName: string; lastName: string }[] }
  >();
  for (const p of withTeam) {
    const tid = p.teamId!;
    const cur =
      byTeam.get(tid) ?? {
        teamName: p.team?.name ?? "Команда",
        players: [],
      };
    cur.players.push({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
    });
    byTeam.set(tid, cur);
  }

  const sortedTeamIds = [...byTeam.keys()].sort();
  return sortedTeamIds.map((teamId) => {
    const meta = byTeam.get(teamId)!;
    const playerIds = [...meta.players].sort((a, b) => a.id.localeCompare(b.id)).map((x) => x.id);
    const orderPlayers = [...meta.players].sort((a, b) => a.id.localeCompare(b.id));
    return {
      teamId,
      teamName: meta.teamName,
      playerIds,
      playersLabel: buildPlayersShortLabel(orderPlayers),
    };
  });
}

export function effectivePostTime(p: {
  publishedAt: Date | null;
  createdAt: Date;
}): Date {
  return p.publishedAt ?? p.createdAt;
}

/** Превью и непрочитанные для одной команды (родитель). */
export async function computeParentAnnouncementChannelSummary(
  parentId: string,
  teamId: string
): Promise<{ preview: string; updatedAt: string; unreadCount: number }> {
  const t0 = Date.now();
  const tlog = (phase: string, extra?: Record<string, unknown>) =>
    announcementTiming("computeParentAnnouncementChannelSummary", phase, {
      teamId,
      ms: Date.now() - t0,
      ...extra,
    });

  tlog("enter");
  tlog("db_parentTeamAnnouncementRead_findUnique_enter");
  const readRow = await prisma.parentTeamAnnouncementRead.findUnique({
    where: { parentId_teamId: { parentId, teamId } },
  });
  tlog("db_parentTeamAnnouncementRead_findUnique_exit", {
    hasRow: Boolean(readRow),
  });
  const lastReadAt = readRow?.lastReadAt ?? null;

  tlog("db_teamFeedPost_findMany_enter");
  const rawPosts = await prisma.teamFeedPost.findMany({
    where: { teamId, isPublished: true },
  });
  tlog("db_teamFeedPost_findMany_exit", { rows: rawPosts.length });

  const posts = [...rawPosts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return effectivePostTime(b).getTime() - effectivePostTime(a).getTime();
  });

  const unreadCount = posts.filter((p) => {
    const t = effectivePostTime(p);
    return !lastReadAt || t > lastReadAt;
  }).length;

  const latest = posts[0];
  const previewText = latest
    ? `${latest.title}: ${latest.body}`.replace(/\s+/g, " ").trim().slice(0, 140)
    : "";
  const updatedAt = latest
    ? effectivePostTime(latest).toISOString()
    : new Date().toISOString();

  tlog("exit", { unreadCount });
  return { preview: previewText, updatedAt, unreadCount };
}

/** Несколько строк инбокса: по одной на команду ребёнка. */
export async function listParentAnnouncementInboxChannels(
  parentId: string
): Promise<
  | { ok: true; channels: ParentAnnouncementChannelInbox[] }
  | { ok: false; reason: "no_players" | "no_team" }
> {
  const t0 = Date.now();
  const tlog = (phase: string, extra?: Record<string, unknown>) =>
    announcementTiming("listParentAnnouncementInboxChannels", phase, {
      ms: Date.now() - t0,
      ...extra,
    });

  tlog("enter");
  const choices = await listParentAnnouncementTeamChoices(parentId);
  tlog("after_listChoices", { teams: choices.length });
  if (choices.length === 0) {
    tlog("db_loadParentPlayers_fallback_enter");
    const players = await loadParentPlayersWithTeamsFixed(parentId);
    tlog("db_loadParentPlayers_fallback_exit", { players: players.length });
    if (players.length === 0) {
      tlog("exit", { ok: false, reason: "no_players" });
      return { ok: false, reason: "no_players" };
    }
    tlog("exit", { ok: false, reason: "no_team" });
    return { ok: false, reason: "no_team" };
  }

  const channels: ParentAnnouncementChannelInbox[] = [];
  for (const c of choices) {
    tlog("per_team_summary_enter", { teamId: c.teamId });
    const summary = await computeParentAnnouncementChannelSummary(parentId, c.teamId);
    tlog("per_team_summary_exit", { teamId: c.teamId });
    const anchor = c.playerIds[0];
    if (!anchor) continue;
    channels.push({
      teamId: c.teamId,
      teamName: c.teamName,
      anchorPlayerId: anchor,
      playersLabel: c.playersLabel,
      ...summary,
    });
  }
  tlog("exit", { ok: true, channels: channels.length });
  return { ok: true, channels };
}

export async function resolveTeamForParentAnnouncements(
  parentId: string,
  input?: ResolveParentTeamAnnouncementsInput | null
): Promise<ParentTeamResolution> {
  const playerId = input?.playerId?.trim() || null;
  const teamIdArg = input?.teamId?.trim() || null;

  if (teamIdArg) {
    const allowed = await canParentAccessTeam(parentId, teamIdArg);
    if (!allowed) return { ok: false, reason: "forbidden_team" };
    const team = await prisma.team.findUnique({
      where: { id: teamIdArg },
      select: { id: true, name: true },
    });
    if (!team) return { ok: false, reason: "forbidden_team" };
    if (playerId) {
      const okP = await canParentAccessPlayer(parentId, playerId);
      if (!okP) return { ok: false, reason: "forbidden_player" };
      const pl = await prisma.player.findUnique({
        where: { id: playerId },
        select: { teamId: true },
      });
      if (!pl?.teamId || pl.teamId !== teamIdArg) {
        return { ok: false, reason: "forbidden_player" };
      }
    }
    return {
      ok: true,
      teamId: team.id,
      teamName: team.name,
      multipleTeamsWarning: null,
      playerIdUsed: playerId,
    };
  }

  const players = await loadParentPlayersWithTeamsFixed(parentId);

  if (players.length === 0) {
    return { ok: false, reason: "no_players" };
  }

  const withTeam = players.filter((p): p is typeof p & { teamId: string } =>
    Boolean(p.teamId)
  );
  if (withTeam.length === 0) {
    return { ok: false, reason: "no_team" };
  }

  if (playerId) {
    const allowed = await canParentAccessPlayer(parentId, playerId);
    if (!allowed) return { ok: false, reason: "forbidden_player" };
    const p = withTeam.find((x) => x.id === playerId);
    if (!p?.teamId) return { ok: false, reason: "no_team" };
    return {
      ok: true,
      teamId: p.teamId,
      teamName: p.team?.name ?? "Команда",
      multipleTeamsWarning: null,
      playerIdUsed: playerId,
    };
  }

  const byTeam = new Map<string, { teamName: string; playerIds: string[] }>();
  for (const p of withTeam) {
    const tid = p.teamId!;
    const cur = byTeam.get(tid) ?? { teamName: p.team?.name ?? "Команда", playerIds: [] };
    cur.playerIds.push(p.id);
    byTeam.set(tid, cur);
  }

  if (byTeam.size === 1) {
    const [teamId, meta] = [...byTeam.entries()][0]!;
    return {
      ok: true,
      teamId,
      teamName: meta.teamName,
      multipleTeamsWarning: null,
      playerIdUsed: null,
    };
  }

  return {
    ok: false,
    reason: "multi_team_choice_required",
    choices: await listParentAnnouncementTeamChoices(parentId),
  };
}

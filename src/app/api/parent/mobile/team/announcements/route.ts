/**
 * GET /api/parent/mobile/team/announcements
 * Query: playerId, teamId (optional; одно из двух или оба — при нескольких командах обязательно),
 *        summary=1 (инбокс: по строке на команду)
 * Auth: Bearer parent session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  resolveTeamForParentAnnouncements,
  effectivePostTime,
  listParentAnnouncementInboxChannels,
} from "@/lib/parent-team-announcements";
import { announcementKindForParent } from "@/lib/team-announcements-crm";

function mapPost(p: {
  id: string;
  teamId: string;
  type: string;
  title: string;
  body: string;
  authorRole: string;
  authorName: string;
  isPinned: boolean;
  imageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    teamId: p.teamId,
    kind: announcementKindForParent(p.type),
    title: p.title,
    body: p.body,
    authorRole: p.authorRole,
    authorName: p.authorName,
    isPinned: p.isPinned,
    hasMedia: Boolean(p.imageUrl?.trim()),
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const log = (phase: string, extra?: Record<string, unknown>) =>
    console.log("[api.timing] GET /api/parent/mobile/team/announcements", phase, {
      ms: Date.now() - t0,
      ...extra,
    });

  log("route_enter");
  const user = await getAuthFromRequest(req);
  log("auth_done", { summary: new URL(req.url).searchParams.get("summary") === "1" });

  if (user?.role !== "PARENT" || !user.parentId) {
    log("response_send", { status: 401 });
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");
  const teamIdParam = searchParams.get("teamId");
  const summaryOnly = searchParams.get("summary") === "1";

  if (summaryOnly) {
    const inbox = await listParentAnnouncementInboxChannels(user.parentId);
    log("inbox_done", { ok: inbox.ok });
    if (!inbox.ok) {
      log("response_send", { status: 200, summary: true, ok: false });
      return NextResponse.json({
        ok: false,
        reason: inbox.reason,
        channels: [],
      });
    }
    log("response_send", {
      status: 200,
      summary: true,
      channels: inbox.channels.length,
    });
    return NextResponse.json({
      ok: true,
      channels: inbox.channels,
    });
  }

  const resolved = await resolveTeamForParentAnnouncements(user.parentId, {
    playerId,
    teamId: teamIdParam,
  });

  if (!resolved.ok) {
    if (resolved.reason === "forbidden_player" || resolved.reason === "forbidden_team") {
      log("response_send", { status: 403, detail: true });
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (resolved.reason === "multi_team_choice_required") {
      log("response_send", { status: 200, detail: true, multiTeam: true });
      return NextResponse.json({
        ok: false,
        reason: "multi_team_choice_required",
        choices: resolved.choices ?? [],
        team: null,
        teamId: null,
        teamName: null,
        announcements: [],
        unreadCount: 0,
        lastReadAt: null,
      });
    }
    log("response_send", { status: 200, detail: true, ok: false });
    return NextResponse.json({
      ok: false,
      reason: resolved.reason,
      team: null,
      teamId: null,
      teamName: null,
      announcements: [],
      unreadCount: 0,
      preview: "",
      updatedAt: new Date().toISOString(),
      multipleTeamsWarning: null,
    });
  }

  const readRow = await prisma.parentTeamAnnouncementRead.findUnique({
    where: {
      parentId_teamId: {
        parentId: user.parentId,
        teamId: resolved.teamId,
      },
    },
  });
  const lastReadAt = readRow?.lastReadAt ?? null;

  const rawPosts = await prisma.teamFeedPost.findMany({
    where: { teamId: resolved.teamId, isPublished: true },
  });

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

  log("detail_posts_done");
  log("response_send", { status: 200, detail: true });
  return NextResponse.json({
    ok: true,
    team: { id: resolved.teamId, name: resolved.teamName },
    announcements: posts.map(mapPost),
    unreadCount,
    lastReadAt: lastReadAt?.toISOString() ?? null,
    multipleTeamsWarning: null,
    preview: previewText,
    updatedAt,
  });
}

/**
 * GET  /api/teams/[id]/announcements — список постов команды (включая снятые с публикации)
 * POST /api/teams/[id]/announcements — создать объявление
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTeam } from "@/lib/data-scope";
import {
  parseAnnouncementTypeForWrite,
  TEAM_ANNOUNCEMENT_KINDS,
} from "@/lib/team-announcements-crm";
import { fireTeamAnnouncementPush } from "@/lib/notifications/notifyTeamAnnouncementPush";
import { effectivePostTime } from "@/lib/parent-team-announcements";

function mapPost(p: {
  id: string;
  teamId: string;
  authorId: string;
  authorRole: string;
  authorName: string;
  type: string;
  title: string;
  body: string;
  imageUrl: string | null;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    teamId: p.teamId,
    type: p.type,
    title: p.title,
    body: p.body,
    authorId: p.authorId,
    authorName: p.authorName,
    authorRole: p.authorRole,
    isPinned: p.isPinned,
    isPublished: p.isPublished,
    imageUrl: p.imageUrl,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user || user.role === "PARENT") {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const { id: teamId } = await params;
  if (!teamId) {
    return NextResponse.json({ error: "Команда не указана" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }
  if (!canAccessTeam(user, team)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  const raw = await prisma.teamFeedPost.findMany({
    where: { teamId },
  });
  const posts = [...raw].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return effectivePostTime(b).getTime() - effectivePostTime(a).getTime();
  });

  return NextResponse.json({
    ok: true,
    allowedKinds: TEAM_ANNOUNCEMENT_KINDS,
    posts: posts.map(mapPost),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "create");
  if (res) return res;

  const { id: teamId } = await params;
  if (!teamId) {
    return NextResponse.json({ error: "Команда не указана" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { coach: true },
  });
  if (!team) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }
  if (!canAccessTeam(user!, team)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const typeRaw = typeof body.type === "string" ? body.type : "";
  const type = parseAnnouncementTypeForWrite(typeRaw);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body.trim() : "";
  const isPinned = Boolean(body.isPinned);
  const publishNow = body.publish !== false;

  if (!type) {
    return NextResponse.json({ error: "Некорректный тип объявления" }, { status: 400 });
  }
  if (!title || !bodyText) {
    return NextResponse.json(
      { error: "Заголовок и текст обязательны" },
      { status: 400 }
    );
  }

  let authorName = user!.name?.trim() || "";
  if (!authorName && team.coach) {
    authorName = `${team.coach.firstName} ${team.coach.lastName}`;
  }
  if (!authorName) {
    authorName =
      user!.role === "SCHOOL_ADMIN" || user!.role === "SCHOOL_MANAGER"
        ? "Школа"
        : "Тренер";
  }

  const now = new Date();
  const post = await prisma.teamFeedPost.create({
    data: {
      teamId,
      authorId: user!.id,
      authorRole:
        user!.role === "SCHOOL_ADMIN" || user!.role === "SCHOOL_MANAGER"
          ? "admin"
          : "coach",
      authorName,
      type,
      title,
      body: bodyText,
      imageUrl: null,
      isPinned,
      isPublished: publishNow,
      publishedAt: publishNow ? now : null,
    },
  });

  if (publishNow) {
    fireTeamAnnouncementPush(teamId, type, title, post.id, {
      body: post.body,
      authorName,
    });
  }

  return NextResponse.json({ ok: true, post: mapPost(post) });
}

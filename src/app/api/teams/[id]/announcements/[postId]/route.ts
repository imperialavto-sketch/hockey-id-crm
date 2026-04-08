/**
 * PATCH  /api/teams/[id]/announcements/[postId]
 * DELETE /api/teams/[id]/announcements/[postId]
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { canAccessTeam } from "@/lib/data-scope";
import { parseAnnouncementTypeForWrite } from "@/lib/team-announcements-crm";
import { fireTeamAnnouncementPush } from "@/lib/notifications/notifyTeamAnnouncementPush";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;

  const { id: teamId, postId } = await params;
  if (!teamId || !postId) {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }
  if (!canAccessTeam(user!, team)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  const post = await prisma.teamFeedPost.findUnique({ where: { id: postId } });
  if (!post || post.teamId !== teamId) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.type != null) {
    const t = parseAnnouncementTypeForWrite(String(body.type));
    if (!t) {
      return NextResponse.json({ error: "Некорректный тип объявления" }, { status: 400 });
    }
    data.type = t;
  }
  if (body.title != null) data.title = String(body.title).trim();
  if (body.body != null) data.body = String(body.body).trim();
  if (body.isPinned !== undefined) data.isPinned = Boolean(body.isPinned);

  const wasPublished = post.isPublished;
  let publishTransition: "toPublished" | null = null;
  if (body.isPublished !== undefined) {
    const nextPub = Boolean(body.isPublished);
    data.isPublished = nextPub;
    if (nextPub && !wasPublished) {
      data.publishedAt = new Date();
      publishTransition = "toPublished";
    }
    if (!nextPub) {
      data.publishedAt = null;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет данных для сохранения" }, { status: 400 });
  }

  const titleNext =
    typeof data.title === "string" ? data.title : post.title;
  const bodyNext = typeof data.body === "string" ? data.body : post.body;
  const typeNext = typeof data.type === "string" ? data.type : post.type;

  if (typeof data.title === "string" && !data.title) {
    return NextResponse.json({ error: "Заголовок не может быть пустым" }, { status: 400 });
  }
  if (typeof data.body === "string" && !data.body) {
    return NextResponse.json({ error: "Текст не может быть пустым" }, { status: 400 });
  }

  const updated = await prisma.teamFeedPost.update({
    where: { id: postId },
    data,
  });

  if (publishTransition === "toPublished") {
    fireTeamAnnouncementPush(teamId, typeNext, titleNext, postId, {
      body: updated.body,
      authorName: updated.authorName,
    });
  }

  return NextResponse.json({ ok: true, post: mapPost(updated) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "delete");
  if (res) return res;

  const { id: teamId, postId } = await params;
  if (!teamId || !postId) {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
  }
  if (!canAccessTeam(user!, team)) {
    return NextResponse.json({ error: "Нет доступа к команде" }, { status: 403 });
  }

  const post = await prisma.teamFeedPost.findUnique({ where: { id: postId } });
  if (!post || post.teamId !== teamId) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  await prisma.teamFeedPost.delete({ where: { id: postId } });
  return NextResponse.json({ ok: true });
}

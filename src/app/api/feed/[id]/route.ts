/**
 * GET /api/feed/[id] — get single post
 * PATCH /api/feed/[id] — update post
 * DELETE /api/feed/[id] — delete post
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { getParentTeamIds } from "@/lib/feed/getParentTeamIds";
import { canAccessTeam } from "@/lib/data-scope";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID публикации обязателен" }, { status: 400 });
  }

  try {
    const post = await prisma.teamFeedPost.findUnique({
      where: { id },
      include: { team: { select: { name: true, schoolId: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Публикация не найдена" }, { status: 404 });
    }

    let hasAccess = false;
    if (user.role === "PARENT" && user.parentId) {
      const teamIds = await getParentTeamIds(user.parentId);
      hasAccess = teamIds.includes(post.teamId);
    } else if (
      (user.role === "COACH" || user.role === "MAIN_COACH") &&
      user.teamId
    ) {
      hasAccess = post.teamId === user.teamId;
    } else if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    return NextResponse.json({
      id: post.id,
      teamId: post.teamId,
      teamName: post.team?.name,
      authorId: post.authorId,
      authorName: post.authorName,
      authorRole: post.authorRole as "coach" | "admin",
      type: post.type,
      title: post.title,
      body: post.body,
      imageUrl: post.imageUrl,
      isPinned: post.isPinned,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("GET /api/feed/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки публикации", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "edit");
  if (res) return res;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID публикации обязателен" }, { status: 400 });
  }

  try {
    const post = await prisma.teamFeedPost.findUnique({
      where: { id },
      include: { team: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Публикация не найдена" }, { status: 404 });
    }

    if (!post.team) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    if (!canAccessTeam(user!, post.team)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (body.type != null) data.type = String(body.type);
    if (body.title != null) data.title = String(body.title).trim();
    if (body.body != null) data.body = String(body.body).trim();
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    if (body.isPinned !== undefined) data.isPinned = Boolean(body.isPinned);

    const updated = await prisma.teamFeedPost.update({
      where: { id },
      data,
      include: { team: { select: { name: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      teamId: updated.teamId,
      teamName: updated.team?.name,
      authorId: updated.authorId,
      authorName: updated.authorName,
      authorRole: updated.authorRole as "coach" | "admin",
      type: updated.type,
      title: updated.title,
      body: updated.body,
      imageUrl: updated.imageUrl,
      isPinned: updated.isPinned,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      publishedAt: updated.publishedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("PATCH /api/feed/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка обновления публикации", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "trainings", "delete");
  if (res) return res;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID публикации обязателен" }, { status: 400 });
  }

  try {
    const post = await prisma.teamFeedPost.findUnique({
      where: { id },
      include: { team: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Публикация не найдена" }, { status: 404 });
    }

    if (!post.team || !canAccessTeam(user!, post.team)) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    await prisma.teamFeedPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/feed/[id] failed:", error);
    return NextResponse.json(
      { error: "Ошибка удаления публикации", details: error instanceof Error ? error.message : "" },
      { status: 500 }
    );
  }
}

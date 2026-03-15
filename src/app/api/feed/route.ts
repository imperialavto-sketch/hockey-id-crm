/**
 * GET /api/feed — list feed posts for parent (their teams) or coach/admin (their teams).
 * POST /api/feed — create post (coach/admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/api-rbac";
import { getParentTeamIds } from "@/lib/feed/getParentTeamIds";
import { sendPushToParents } from "@/lib/notifications/sendPush";
import { getParentIdsForTeam } from "@/lib/notifications/getParentsForTeam";
import { canAccessTeam } from "@/lib/data-scope";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    let teamIds: string[];

    if (user.role === "PARENT" && user.parentId) {
      teamIds = await getParentTeamIds(user.parentId);
    } else if (
      (user.role === "COACH" || user.role === "MAIN_COACH") &&
      user.teamId
    ) {
      teamIds = [user.teamId];
    } else if (user.role === "SCHOOL_ADMIN" || user.role === "SCHOOL_MANAGER") {
      const teams = await prisma.team.findMany({
        where: user.schoolId ? { schoolId: user.schoolId } : undefined,
        select: { id: true },
      });
      teamIds = teams.map((t) => t.id);
    } else {
      return NextResponse.json([]);
    }

    if (teamIds.length === 0) {
      return NextResponse.json([]);
    }

    const posts = await prisma.teamFeedPost.findMany({
      where: { teamId: { in: teamIds } },
      include: { team: { select: { name: true } } },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
    });

    const mapped = posts.map((p) => ({
      id: p.id,
      teamId: p.teamId,
      teamName: p.team?.name,
      authorId: p.authorId,
      authorName: p.authorName,
      authorRole: p.authorRole as "coach" | "admin",
      type: p.type,
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl,
      isPinned: p.isPinned,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      publishedAt: p.publishedAt?.toISOString() ?? null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/feed failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки ленты",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, res } = await requirePermission(req, "trainings", "create");
  if (res) return res;

  try {
    const body = await req.json().catch(() => ({}));
    const { teamId, type, title, body: bodyText, imageUrl, isPinned } = body;

    if (!teamId || !type || !title || typeof bodyText !== "string") {
      return NextResponse.json(
        { error: "teamId, type, title и body обязательны" },
        { status: 400 }
      );
    }

    const validTypes = [
      "announcement",
      "news",
      "schedule_update",
      "match_day",
      "photo_post",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Некорректный тип публикации" },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { coach: true, school: { select: { id: true } } },
    });
    if (!team) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const teamLike = { id: team.id, schoolId: team.schoolId };
    if (!canAccessTeam(user!, teamLike)) {
      return NextResponse.json({ error: "Нет доступа к этой команде" }, { status: 403 });
    }

    let authorName = user?.name ?? "Тренер";
    const coach = team.coachId
      ? await prisma.coach.findUnique({ where: { id: team.coachId } })
      : null;
    if (coach) {
      authorName = `${coach.firstName} ${coach.lastName}`;
    }

    const post = await prisma.teamFeedPost.create({
      data: {
        teamId,
        authorId: user!.id,
        authorRole: user!.role === "SCHOOL_ADMIN" || user!.role === "SCHOOL_MANAGER" ? "admin" : "coach",
        authorName,
        type,
        title: String(title).trim(),
        body: bodyText.trim(),
        imageUrl: imageUrl ? String(imageUrl).trim() || null : null,
        isPinned: Boolean(isPinned),
        publishedAt: new Date(),
      },
      include: { team: { select: { name: true } } },
    });

    const shouldNotify = ["announcement", "schedule_update", "match_day"].includes(type);
    if (shouldNotify) {
      const parentIds = await getParentIdsForTeam(teamId);
      if (parentIds.length > 0) {
        const notifTitle =
          type === "announcement"
            ? "Объявление"
            : type === "schedule_update"
              ? "Изменение расписания"
              : "Матч";
        void sendPushToParents(parentIds, {
          type: "general",
          title: notifTitle,
          body: post.title,
        });
      }
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
    console.error("POST /api/feed failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка создания публикации",
        details: error instanceof Error ? error.message : "",
      },
      { status: 500 }
    );
  }
}

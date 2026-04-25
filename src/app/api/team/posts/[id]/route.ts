/**
 * GET /api/team/posts/[id] — single team feed post for parent-app (same access as GET /api/feed/[id]).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentTeamIds } from "@/lib/feed/getParentTeamIds";
import { mapTeamFeedPostToTeamPostResponse } from "@/lib/team/mapTeamFeedPostToParentTeamPost";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthFromRequest(_req);
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

    return NextResponse.json(mapTeamFeedPostToTeamPostResponse(post), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[GET /api/team/posts/[id]]", error);
    return NextResponse.json(
      { error: "Ошибка загрузки публикации" },
      { status: 500 }
    );
  }
}

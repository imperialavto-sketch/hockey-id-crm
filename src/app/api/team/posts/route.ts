/**
 * GET /api/team/posts — team feed for parent-app (same access as GET /api/feed).
 * Returns JSON array of TeamPost-shaped objects (Bearer auth).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentTeamIds } from "@/lib/feed/getParentTeamIds";
import { mapTeamFeedPostToTeamPostResponse } from "@/lib/team/mapTeamFeedPostToParentTeamPost";

export async function GET(_req: NextRequest) {
  const user = await getAuthFromRequest(_req);
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
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    const mapped = posts.map((p) => mapTeamFeedPostToTeamPostResponse(p));
    return NextResponse.json(mapped, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/team/posts]", error);
    return NextResponse.json(
      { error: "Ошибка загрузки публикаций" },
      { status: 500 }
    );
  }
}

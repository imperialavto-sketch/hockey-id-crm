import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";
import {
  dedupeAndCapTeamIdsPreserveOrder,
  loadArenaCrmOperationalFocusStringRowsForTeamIds,
} from "@/lib/arena/crm/loadArenaCrmSnapshotData";

const MAX_TEAM_IDS = 80;
const MAX_LINES_PER_TEAM = 2;

export type TeamsRegistryArenaOperationalLineItem = {
  teamId: string;
  lines: string[];
};

/**
 * POST /api/teams/registry-arena-operational-lines
 * Read-only batch: operational focus lines по последней подтверждённой live-сессии
 * для переданных teamIds (пересечение с доступом пользователя к командам).
 */
export async function POST(request: NextRequest) {
  const { user, res } = await requirePermission(request, "teams", "view");
  if (res) return res;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const raw = body?.teamIds;
    const orderedIds = Array.isArray(raw)
      ? raw
          .map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
          .filter((id: string) => id.length > 0)
      : [];

    const requested = dedupeAndCapTeamIdsPreserveOrder(orderedIds, MAX_TEAM_IDS);

    if (requested.length === 0) {
      return NextResponse.json({ items: [] satisfies TeamsRegistryArenaOperationalLineItem[] });
    }

    const accessible = await getAccessibleTeamIds(user, prisma);
    const allowedIds =
      accessible === null ? requested : requested.filter((id) => accessible.includes(id));

    if (allowedIds.length === 0) {
      return NextResponse.json({ items: [] satisfies TeamsRegistryArenaOperationalLineItem[] });
    }

    const items = await loadArenaCrmOperationalFocusStringRowsForTeamIds(allowedIds, {
      maxTeams: MAX_TEAM_IDS,
      maxLinesPerTeam: MAX_LINES_PER_TEAM,
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("POST /api/teams/registry-arena-operational-lines failed:", e);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

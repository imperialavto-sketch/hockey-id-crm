import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";
import { getAccessibleTeamIds } from "@/lib/data-scope";
import { loadArenaCrmOperationalFocusStringRowsForTeamIds } from "@/lib/arena/crm/loadArenaCrmSnapshotData";

const MAX_TEAMS = 6;
const MAX_LINES_PER_TEAM = 2;

export type DashboardArenaOperationalPreviewItem = {
  teamId: string;
  teamName: string;
  lines: string[];
};

/**
 * GET /api/dashboard/arena-operational-preview — read-only digest operational focus
 * по доступным командам (без full snapshot, без изменения summary route).
 */
export async function GET(request: NextRequest) {
  const { user, res } = await requirePermission(request, "dashboard", "view");
  if (res) return res;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessibleIds = await getAccessibleTeamIds(user, prisma);

    let teamRows: { id: string; name: string }[] = [];
    if (accessibleIds === null) {
      teamRows = await prisma.team.findMany({
        take: MAX_TEAMS,
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    } else if (accessibleIds.length === 0) {
      return NextResponse.json({ items: [], count: 0 });
    } else {
      const ids = accessibleIds.slice(0, MAX_TEAMS);
      teamRows = await prisma.team.findMany({
        where: { id: { in: ids } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    }

    const lineByTeamId = new Map(
      (
        await loadArenaCrmOperationalFocusStringRowsForTeamIds(
          teamRows.map((t) => t.id),
          { maxTeams: MAX_TEAMS, maxLinesPerTeam: MAX_LINES_PER_TEAM }
        )
      ).map((r) => [r.teamId, r.lines])
    );

    const items: DashboardArenaOperationalPreviewItem[] = [];
    for (const t of teamRows) {
      const lines = lineByTeamId.get(t.id);
      if (!lines?.length) continue;
      items.push({ teamId: t.id, teamName: t.name, lines });
    }

    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    console.error("GET /api/dashboard/arena-operational-preview failed:", e);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadArenaCrmTeamArenaSnapshotBundle } from "@/lib/arena/crm/loadArenaCrmSnapshotData";
import {
  toArenaCrmOperationalFocusWireJson,
  type ArenaCrmOperationalFocusWireJson,
} from "@/lib/arena/crm/arenaCrmOperationalFocusWire";
import { requirePermission } from "@/lib/api-rbac";

/**
 * Frozen CRM pattern: `supercoreOperationalFocus` for this team (latest confirmed live session).
 * Auth mirrors GET /api/teams/[id].
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "teams", "view");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID команды обязателен" }, { status: 400 });
    }
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!team) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const { snap, groupRows } = await loadArenaCrmTeamArenaSnapshotBundle(id);
    const base = toArenaCrmOperationalFocusWireJson(snap);
    const groupArenaSnapshots = groupRows
      .filter((r) => r.arenaCrm.group != null)
      .map((r) => ({
        groupId: r.groupId,
        groupSnapshot: r.arenaCrm.group!,
      }));
    const body: ArenaCrmOperationalFocusWireJson = {
      ...base,
      ...(groupArenaSnapshots.length > 0 ? { groupArenaSnapshots } : {}),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/teams/[id]/arena-crm-snapshot failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки Arena CRM",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

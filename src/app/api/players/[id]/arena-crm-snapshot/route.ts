import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadArenaCrmSnapshotForCrmPlayer } from "@/lib/arena/crm/loadArenaCrmSnapshotData";
import {
  toArenaCrmOperationalFocusWireJson,
  type ArenaCrmOperationalFocusWireJson,
} from "@/lib/arena/crm/arenaCrmOperationalFocusWire";
import { requirePermission } from "@/lib/api-rbac";
import { checkPlayerAccess } from "@/lib/data-scope";

/**
 * Frozen CRM pattern: `supercoreOperationalFocus` for the player’s team (latest confirmed live session).
 * Auth and access mirror GET /api/players/[id] (registry player).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, res } = await requirePermission(req, "players", "view");
  if (res) return res;
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID игрока обязателен" }, { status: 400 });
    }
    const player = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    });
    if (!player) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const accessRes = checkPlayerAccess(user!, { ...player, team: player.team ?? undefined });
    if (accessRes) return accessRes;

    const snap = await loadArenaCrmSnapshotForCrmPlayer(id);
    const body: ArenaCrmOperationalFocusWireJson = toArenaCrmOperationalFocusWireJson(snap);
    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/players/[id]/arena-crm-snapshot failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки Arena CRM",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

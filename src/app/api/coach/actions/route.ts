/**
 * GET /api/coach/actions
 * Coach-scoped list of players requiring attention.
 * Auth: Bearer (requireCrmRole).
 * Data: CoachSessionObservation with impact='negative'.
 * Fallback: [] when no negative observations.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCrmRole } from "@/lib/api-rbac";
import { getAccessiblePlayerIds } from "@/lib/data-scope";

export async function GET(req: NextRequest) {
  const { user, res } = await requireCrmRole(req);
  if (res) return res;

  try {
    const accessibleIds = await getAccessiblePlayerIds(user!, prisma);
    const playerIdSet =
      accessibleIds === null ? null : new Set<string>(accessibleIds);

    const observations = await prisma.coachSessionObservation.findMany({
      where: {
        coachSession: {
          coachUserId: user!.id,
          endedAt: { not: null },
        },
        impact: "negative",
      },
      include: { coachSession: true },
      orderBy: { createdAtTs: "desc" },
    });

    const byPlayer = new Map<
      string,
      { playerName: string; count: number; reason: string; updatedAt: Date }
    >();

    for (const obs of observations) {
      if (playerIdSet !== null && !playerIdSet.has(obs.playerId)) continue;

      const existing = byPlayer.get(obs.playerId);
      const reason =
        obs.note?.trim() ||
        `Спад по навыку: ${obs.skillType || "общий"}`;

      if (existing) {
        existing.count += 1;
        if (
          obs.createdAtTs > existing.updatedAt ||
          !existing.reason ||
          existing.reason === "Стоит обсудить прогресс"
        ) {
          existing.reason = reason;
          existing.updatedAt = obs.createdAtTs;
        }
      } else {
        byPlayer.set(obs.playerId, {
          playerName: obs.playerName || "Игрок",
          count: 1,
          reason,
          updatedAt: obs.createdAtTs,
        });
      }
    }

    const items = Array.from(byPlayer.entries()).map(
      ([playerId, { playerName, count, reason, updatedAt }]) => ({
        playerId,
        playerName,
        reason,
        severity: count >= 3 ? "high" : count >= 2 ? "medium" : "low",
        observationsCount: count,
        updatedAt: updatedAt.toISOString(),
      })
    );

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/coach/actions failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки действий",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

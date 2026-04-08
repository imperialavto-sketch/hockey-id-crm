import { NextRequest, NextResponse } from "next/server";
import { requireExternalCoach } from "@/lib/external-coach-auth";
import { prisma } from "@/lib/prisma";
import { buildExternalCoachRequestView } from "@/lib/arena/build-external-coach-request-view";
import { getExternalTrainingReportByRequestId } from "@/lib/arena/external-training-reports";

const ACTIVE_STATUSES = ["confirmed_by_parent", "in_progress"] as const;

export async function GET(req: NextRequest) {
  const gate = await requireExternalCoach(req);
  if (!gate.ok) return gate.res;

  const rows = await prisma.externalTrainingRequest.findMany({
    where: {
      coachId: gate.auth.arenaCoachKey,
      status: { in: [...ACTIVE_STATUSES] },
    },
    orderBy: { updatedAt: "desc" },
  });

  const playerIds = [...new Set(rows.map((r) => r.playerId))];
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthYear: true,
      birthDate: true,
    },
  });
  const playerById = new Map(players.map((p) => [p.id, p]));

  const views = await Promise.all(
    rows.map(async (row) => {
      const report = await getExternalTrainingReportByRequestId(row.id);
      const p = playerById.get(row.playerId);
      const playerMini = p ?? {
        firstName: "",
        lastName: "",
        birthYear: null,
        birthDate: null,
      };
      return buildExternalCoachRequestView(row, playerMini, {
        latestReportExists: report != null,
      });
    })
  );

  return NextResponse.json(views);
}

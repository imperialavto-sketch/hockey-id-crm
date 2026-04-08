import { NextRequest, NextResponse } from "next/server";
import { requireExternalCoach } from "@/lib/external-coach-auth";
import { prisma } from "@/lib/prisma";
import { buildExternalCoachRequestView } from "@/lib/arena/build-external-coach-request-view";
import { getExternalTrainingReportByRequestId } from "@/lib/arena/external-training-reports";
import type { Prisma } from "@prisma/client";

function focusAreasFromJson(value: Prisma.JsonValue | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((x) => (typeof x === "string" ? x.trim() : String(x)))
      .filter(Boolean);
  }
  return [];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireExternalCoach(req);
  if (!gate.ok) return gate.res;

  const { id } = await params;
  const requestId = id?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const row = await prisma.externalTrainingRequest.findFirst({
    where: {
      id: requestId,
      coachId: gate.auth.arenaCoachKey,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Запрос не найден" }, { status: 404 });
  }

  const player = await prisma.player.findUnique({
    where: { id: row.playerId },
    select: {
      firstName: true,
      lastName: true,
      birthYear: true,
      birthDate: true,
    },
  });
  const playerMini = player ?? {
    firstName: "",
    lastName: "",
    birthYear: null,
    birthDate: null,
  };

  const report = await getExternalTrainingReportByRequestId(row.id);
  const reportFocusAreas = report ? focusAreasFromJson(report.focusAreas) : undefined;

  return NextResponse.json(
    buildExternalCoachRequestView(row, playerMini, {
      latestReportExists: report != null,
      reportFocusAreas,
      existingReport: report
        ? { summary: report.summary, nextSteps: report.nextSteps }
        : null,
    })
  );
}

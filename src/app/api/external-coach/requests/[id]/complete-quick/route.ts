import { NextRequest, NextResponse } from "next/server";
import { requireExternalCoach } from "@/lib/external-coach-auth";
import { prisma } from "@/lib/prisma";
import { buildExternalCoachRequestView } from "@/lib/arena/build-external-coach-request-view";
import {
  getExternalTrainingReportByRequestId,
  upsertExternalTrainingReportByRequest,
} from "@/lib/arena/external-training-reports";
import { buildExternalTrainingReportView } from "@/lib/arena/build-external-training-report-view";
import { setExternalTrainingRequestStatus } from "@/lib/arena/external-training-requests";
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

export async function POST(
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

  const view = buildExternalCoachRequestView(row, playerMini, {
    latestReportExists: report != null,
    reportFocusAreas,
    existingReport: report
      ? { summary: report.summary, nextSteps: report.nextSteps }
      : null,
  });

  const body = await req.json().catch(() => null);
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const bodySummary = typeof o.summary === "string" ? o.summary.trim() : "";
  const bodyNextSteps = Array.isArray(o.nextSteps)
    ? o.nextSteps
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
    : [];

  if (report) {
    const data: { summary?: string; nextSteps?: string | null } = {};
    if (bodySummary) data.summary = bodySummary;
    if (bodyNextSteps.length > 0) {
      data.nextSteps = bodyNextSteps.join("\n");
    }

    let saved = report;
    if (Object.keys(data).length > 0) {
      saved = await prisma.externalTrainingReport.update({
        where: { id: report.id },
        data,
      });
    }

    if (row.status === "confirmed_by_parent") {
      await setExternalTrainingRequestStatus(row.id, "in_progress");
    }

    return NextResponse.json(buildExternalTrainingReportView(saved));
  }

  const finalSummary = bodySummary || view.quickCompletionPreset.suggestedSummary;
  const finalNextSteps =
    bodyNextSteps.length > 0
      ? bodyNextSteps.join("\n")
      : view.quickCompletionPreset.suggestedNextSteps.join("\n");

  const saved = await upsertExternalTrainingReportByRequest({
    requestId: row.id,
    playerId: row.playerId,
    coachId: row.coachId,
    summary: finalSummary,
    focusAreas: view.recommendedFocusAreas,
    resultNotes: null,
    nextSteps: finalNextSteps,
  });

  if (row.status === "confirmed_by_parent") {
    await setExternalTrainingRequestStatus(row.id, "in_progress");
  }

  return NextResponse.json(buildExternalTrainingReportView(saved));
}

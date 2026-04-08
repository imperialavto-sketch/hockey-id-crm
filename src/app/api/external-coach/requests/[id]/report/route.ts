import { NextRequest, NextResponse } from "next/server";
import { requireExternalCoach } from "@/lib/external-coach-auth";
import { prisma } from "@/lib/prisma";
import { upsertExternalTrainingReportByRequest } from "@/lib/arena/external-training-reports";
import { buildExternalTrainingReportView } from "@/lib/arena/build-external-training-report-view";
import { setExternalTrainingRequestStatus } from "@/lib/arena/external-training-requests";

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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  if (!summary) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }

  let focusAreas: string[] | undefined;
  if (Array.isArray(o.focusAreas)) {
    focusAreas = o.focusAreas
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim());
  }

  const resultNotes =
    typeof o.resultNotes === "string" ? o.resultNotes.trim() || null : null;
  const nextSteps =
    typeof o.nextSteps === "string" ? o.nextSteps.trim() || null : null;

  const saved = await upsertExternalTrainingReportByRequest({
    requestId: row.id,
    playerId: row.playerId,
    coachId: row.coachId,
    summary,
    focusAreas,
    resultNotes,
    nextSteps,
  });

  if (row.status === "confirmed_by_parent") {
    await setExternalTrainingRequestStatus(row.id, "in_progress");
  }

  return NextResponse.json(buildExternalTrainingReportView(saved));
}

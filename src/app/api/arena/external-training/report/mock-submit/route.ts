// PHASE 1: `NON_CORE_EXTERNAL_CONTOUR` + stub/mock path — docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md
// PHASE 2 API LOCK — NON_CORE_EXTERNAL_API (docs/PHASE_2_API_ROUTE_LOCK.md, apiContours.ts).
// ARCHITECTURE FREEZE: TEMP/STUB — fixed mock copy for external report; not production SSOT path. See docs/ARCHITECTURE_FREEZE_PHASE_0.md
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { assertParentOrStaffCanAccessPlayer } from "@/lib/arena/assert-parent-or-staff-player-access";
import {
  getLatestActiveExternalTrainingRequestForPlayer,
  setExternalTrainingRequestStatus,
} from "@/lib/arena/external-training-requests";
import {
  createExternalTrainingReport,
  getExternalTrainingReportByRequestId,
} from "@/lib/arena/external-training-reports";
import { buildExternalTrainingReportView } from "@/lib/arena/build-external-training-report-view";

const MOCK_SUMMARY =
  "Первая сессия в дополнительном контуре прошла уверенно: базовая устойчивость на коньках и стойка заметно окрепли. Ребёнок вовлечён и стабильно повторяет упражнения.";

const MOCK_FOCUS_AREAS = [
  "равновесие и опора",
  "работа корпуса в поворотах",
  "темп и ритм шагов",
];

const MOCK_RESULT_NOTES =
  "Тренер отметил внимательность к положению корпуса и готовность держать взгляд вперёд при смене направления.";

const MOCK_NEXT_STEPS =
  "Следующий фокус — мягкий перенос веса в кросс-оуверах и собранная посадка в остановках.";

const MOCK_SUBMIT_DISABLED = {
  error: "Mock submit отключён в production. Используйте канонический контур отчёта внешней тренировки.",
  code: "MOCK_SUBMIT_DISABLED_IN_PRODUCTION" as const,
};

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(MOCK_SUBMIT_DISABLED, {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const user = await getAuthFromRequest(request);
  if (!user?.role) {
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const rawPlayerId = o.playerId;
  const playerId = typeof rawPlayerId === "string" ? rawPlayerId.trim() : "";
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const access = await assertParentOrStaffCanAccessPlayer(user, playerId);
  if (!access.ok) {
    if (access.kind === "not_found") {
      return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
    }
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const latestRequest = await getLatestActiveExternalTrainingRequestForPlayer({
    playerId,
    parentId: user.role === "PARENT" ? user.parentId : null,
  });

  if (!latestRequest) {
    return NextResponse.json(
      { error: "Нет активного запроса внешней тренировки для этого игрока" },
      { status: 404 }
    );
  }

  const existing = await getExternalTrainingReportByRequestId(latestRequest.id);
  if (existing) {
    return NextResponse.json(buildExternalTrainingReportView(existing));
  }

  const created = await createExternalTrainingReport({
    requestId: latestRequest.id,
    playerId: latestRequest.playerId,
    coachId: latestRequest.coachId,
    summary: MOCK_SUMMARY,
    focusAreas: MOCK_FOCUS_AREAS,
    resultNotes: MOCK_RESULT_NOTES,
    nextSteps: MOCK_NEXT_STEPS,
  });

  if (latestRequest.status === "confirmed_by_parent") {
    await setExternalTrainingRequestStatus(latestRequest.id, "in_progress");
  }

  return NextResponse.json(buildExternalTrainingReportView(created));
}

// PHASE 1: `NON_CORE_EXTERNAL_CONTOUR` — docs/PHASE_1_DATA_ARCHITECTURE_LOCK.md
// PHASE 2 API LOCK — NON_CORE_EXTERNAL_API (docs/PHASE_2_API_ROUTE_LOCK.md, apiContours.ts).
// PHASE 6: ❗ NOT CORE SCHOOL SSOT — stub/agent ответ; не основной parent external flow (Prisma request/report).
// ⚠ AI-ASSISTED, NOT AUTONOMOUS AGENT. Продукт не должен вызывать этот root GET (используются subpaths).
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentPlayerById } from "@/lib/parent-players";
import { runExternalTrainingAgent } from "@/lib/arena/agents/external-training-agent";

export async function GET(request: NextRequest) {
  const user = await getAuthFromRequest(request);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  const playerId = request.nextUrl.searchParams.get("playerId")?.trim();
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const player = await getParentPlayerById(user.parentId, playerId);
  if (!player) {
    return NextResponse.json({ error: "Игрок не найден" }, { status: 404 });
  }

  const alternateSlot = request.nextUrl.searchParams.get("alternate") === "1";
  const result = await runExternalTrainingAgent(playerId, { alternateSlot });

  if (!result) {
    return NextResponse.json(
      { error: "No matching coach or slot (mock)" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}

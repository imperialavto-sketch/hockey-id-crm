import { NextRequest, NextResponse } from "next/server";
import { LiveTrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

/**
 * Read-only CRM summary: LiveTrainingSession / LiveTrainingPlayerSignal by User.id
 * (`coachId` on those models). Only for school coaches with `linkedUserId` set.
 * Does not use `src/lib/live-training/*` or `src/lib/arena/*`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { res } = await requirePermission(req, "coaches", "view");
  if (res) return res;

  try {
    const { id } = await params;
    const coachId = id?.trim();
    if (!coachId) {
      return NextResponse.json(
        { error: "Некорректный идентификатор" },
        { status: 400 }
      );
    }

    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { linkedUserId: true, isMarketplaceIndependent: true },
    });

    if (!coach || coach.isMarketplaceIndependent) {
      return NextResponse.json({ error: "Тренер не найден" }, { status: 404 });
    }

    const linkedUserId = coach.linkedUserId;
    if (!linkedUserId) {
      return NextResponse.json({
        hasLinkedUser: false,
        linkedUserId: null,
        liveSessionsCount: 0,
        confirmedSessionsCount: 0,
        signalsCount: 0,
        latestStartedAt: null,
        latestConfirmedAt: null,
        latestSessionStatus: null,
        hasLiveTrainingData: false,
      });
    }

    const userId = linkedUserId;

    const [
      liveSessionsCount,
      confirmedSessionsCount,
      signalsCount,
      latestByStart,
      latestConfirmedRow,
      nonCancelledSessionsCount,
    ] = await Promise.all([
      prisma.liveTrainingSession.count({ where: { coachId: userId } }),
      prisma.liveTrainingSession.count({
        where: {
          coachId: userId,
          status: LiveTrainingSessionStatus.confirmed,
        },
      }),
      prisma.liveTrainingPlayerSignal.count({ where: { coachId: userId } }),
      prisma.liveTrainingSession.findFirst({
        where: { coachId: userId },
        orderBy: { startedAt: "desc" },
        select: { status: true, startedAt: true },
      }),
      prisma.liveTrainingSession.findFirst({
        where: {
          coachId: userId,
          status: LiveTrainingSessionStatus.confirmed,
          confirmedAt: { not: null },
        },
        orderBy: { confirmedAt: "desc" },
        select: { confirmedAt: true },
      }),
      prisma.liveTrainingSession.count({
        where: {
          coachId: userId,
          status: { not: LiveTrainingSessionStatus.cancelled },
        },
      }),
    ]);

    const hasLiveTrainingData =
      nonCancelledSessionsCount > 0 || signalsCount > 0;

    return NextResponse.json({
      hasLinkedUser: true,
      linkedUserId,
      liveSessionsCount,
      confirmedSessionsCount,
      signalsCount,
      latestStartedAt: latestByStart?.startedAt?.toISOString() ?? null,
      latestConfirmedAt: latestConfirmedRow?.confirmedAt?.toISOString() ?? null,
      latestSessionStatus: latestByStart?.status ?? null,
      hasLiveTrainingData,
    });
  } catch (error) {
    console.error("GET /api/coaches/[id]/live-training-summary failed:", error);
    return NextResponse.json(
      {
        error: "Ошибка загрузки сводки",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

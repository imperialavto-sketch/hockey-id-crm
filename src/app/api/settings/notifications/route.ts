import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let s;
    if (userId) {
      s = await prisma.notificationSetting.findFirst({
        where: { userId },
      });
    }
    if (!s) {
      s = await prisma.notificationSetting.findFirst({
        where: { userId: null },
      });
    }
    if (!s) {
      s = await prisma.notificationSetting.create({
        data: {
          emailEnabled: true,
          pushEnabled: true,
          systemEnabled: true,
          newMessages: true,
          newPayments: true,
          overduePayments: true,
          newTrainings: true,
          scheduleChanges: true,
        },
      });
    }
    return NextResponse.json(s);
  } catch (err) {
    console.error("GET /api/settings/notifications failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, userId, ...rest } = body;

    let s = await prisma.notificationSetting.findFirst({
      where: id ? { id } : userId ? { userId } : {},
    });
    if (!s) {
      s = await prisma.notificationSetting.create({
        data: {
          userId: userId || null,
          emailEnabled: rest.emailEnabled ?? true,
          pushEnabled: rest.pushEnabled ?? true,
          systemEnabled: rest.systemEnabled ?? true,
          newMessages: rest.newMessages ?? true,
          newPayments: rest.newPayments ?? true,
          overduePayments: rest.overduePayments ?? true,
          newTrainings: rest.newTrainings ?? true,
          scheduleChanges: rest.scheduleChanges ?? true,
        },
      });
    } else {
      s = await prisma.notificationSetting.update({
        where: { id: s.id },
        data: {
          ...(rest.emailEnabled !== undefined && { emailEnabled: !!rest.emailEnabled }),
          ...(rest.pushEnabled !== undefined && { pushEnabled: !!rest.pushEnabled }),
          ...(rest.systemEnabled !== undefined && { systemEnabled: !!rest.systemEnabled }),
          ...(rest.newMessages !== undefined && { newMessages: !!rest.newMessages }),
          ...(rest.newPayments !== undefined && { newPayments: !!rest.newPayments }),
          ...(rest.overduePayments !== undefined && { overduePayments: !!rest.overduePayments }),
          ...(rest.newTrainings !== undefined && { newTrainings: !!rest.newTrainings }),
          ...(rest.scheduleChanges !== undefined && { scheduleChanges: !!rest.scheduleChanges }),
        },
      });
    }
    return NextResponse.json(s);
  } catch (err) {
    console.error("PUT /api/settings/notifications failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

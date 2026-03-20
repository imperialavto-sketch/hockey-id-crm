import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Доступно только родителям", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const sub = await prisma.subscription.findFirst({
    where: { parentId: user.parentId },
  });

  if (!sub) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    id: sub.id,
    planCode: sub.planCode,
    status: sub.status,
    billingInterval: sub.billingInterval,
    currentPeriodStart: sub.currentPeriodStart.toISOString().slice(0, 10),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString().slice(0, 10),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  });
}



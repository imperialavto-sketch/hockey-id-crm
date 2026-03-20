import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Доступно только родителям", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // Body не обязателен, но парсим для совместимости
  await req.json().catch(() => ({}));

  const existing = await prisma.subscription.findFirst({
    where: { parentId: user.parentId },
  });

  if (!existing) {
    return NextResponse.json(null);
  }

  const updated = await prisma.subscription.update({
    where: { id: existing.id },
    data: { cancelAtPeriodEnd: true },
  });

  return NextResponse.json({
    id: updated.id,
    planCode: updated.planCode,
    status: updated.status,
    billingInterval: updated.billingInterval,
    currentPeriodStart: updated.currentPeriodStart.toISOString().slice(0, 10),
    currentPeriodEnd: updated.currentPeriodEnd.toISOString().slice(0, 10),
    cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
  });
}



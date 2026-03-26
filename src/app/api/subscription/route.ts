import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_STUB_PLANS } from "@/lib/subscriptionStub";

export async function POST(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Доступно только родителям", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  // parentId from body is ignored — we use user.parentId from auth only
  const planId = typeof o.planId === "string" ? o.planId.trim() : undefined;
  const planCode = typeof o.planCode === "string" ? o.planCode.trim() : undefined;
  const planKey = planId || planCode;
  if (!planKey) {
    return NextResponse.json(
      { error: "planId или planCode обязателен" },
      { status: 400 }
    );
  }

  const plan = SUBSCRIPTION_STUB_PLANS.find(
    (p) => p.id === planKey || p.code === planKey
  );
  if (!plan) {
    return NextResponse.json(
      { error: "План не найден" },
      { status: 400 }
    );
  }

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  const sub = await prisma.subscription.upsert({
    where: { parentId: user.parentId },
    create: {
      parentId: user.parentId,
      planCode: plan.code,
      status: "active",
      billingInterval: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
    update: {
      planCode: plan.code,
      status: "active",
      billingInterval: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.subscriptionBillingRecord.create({
    data: {
      parentId: user.parentId,
      subscriptionId: sub.id,
      date: now,
      productName: plan.name,
      amount: plan.priceMonthly,
      currency: "RUB",
      status: "paid",
      type: "subscription",
    },
  });

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



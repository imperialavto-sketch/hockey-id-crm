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

  const records = await prisma.subscriptionBillingRecord.findMany({
    where: { parentId: user.parentId },
    orderBy: { date: "desc" },
  });

  const items = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    productName: r.productName,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    type: r.type,
  }));

  return NextResponse.json(items);
}



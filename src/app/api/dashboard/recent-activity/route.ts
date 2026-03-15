import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-rbac";

export async function GET(req: NextRequest) {
  const { res } = await requirePermission(req, "dashboard", "view");
  if (res) return res;
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(logs);
  } catch (err) {
    console.error("GET /api/dashboard/recent-activity failed:", err);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }
}

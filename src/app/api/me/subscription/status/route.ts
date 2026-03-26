/**
 * GET /api/me/subscription/status — alias for parent-app compatibility.
 * Same auth and data as /api/subscription/status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentSubscriptionStatus } from "@/lib/subscription-parent";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    const sub = await getParentSubscriptionStatus(user.parentId);
    return NextResponse.json(sub);
  } catch (error) {
    console.error("GET /api/me/subscription/status failed:", error);
    return NextResponse.json(
      { error: "Не удалось получить статус подписки" },
      { status: 500 }
    );
  }
}

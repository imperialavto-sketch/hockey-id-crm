/**
 * GET /api/me/subscription/history — alias for parent-app compatibility.
 * Same auth and data as /api/subscription/history.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentSubscriptionHistory } from "@/lib/subscription-parent";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  try {
    const items = await getParentSubscriptionHistory(user.parentId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/me/subscription/history failed:", error);
    return NextResponse.json(
      { error: "Не удалось получить историю подписки" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/me — alias for parent-app compatibility.
 * Returns parent profile id. Used by subscriptionService.getCurrentParentId().
 * Auth: Bearer required. Role: PARENT only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);

  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Необходима авторизация" },
      { status: 401 }
    );
  }

  return NextResponse.json({ id: user.parentId });
}

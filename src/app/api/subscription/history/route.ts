import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/api-auth";
import { getParentSubscriptionHistory } from "@/lib/subscription-parent";

export async function GET(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user || user.role !== "PARENT" || !user.parentId) {
    return NextResponse.json(
      { error: "Доступно только родителям", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const items = await getParentSubscriptionHistory(user.parentId);
  return NextResponse.json(items);
}



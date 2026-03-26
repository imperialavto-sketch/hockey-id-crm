/**
 * GET /api/chat/ai/conversation — Coach Mark history stub.
 * Compatibility alias: parent-app expects this; returns empty until real persistence.
 * No auth, no DB — temporary stub only.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    conversation: null,
    messages: [],
    emptyState: "no_conversation",
  });
}

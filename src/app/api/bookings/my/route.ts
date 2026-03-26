/**
 * GET /api/bookings/my — my bookings stub.
 * Compatibility alias: parent-app expects this; returns empty until real implementation.
 * No auth, no DB — temporary stub only.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    bookings: [],
    emptyState: "no_bookings",
  });
}

/**
 * GET /api/bookings — bookings list stub.
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

export async function POST(request: Request) {
  let booking: Record<string, unknown> = {};

  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      booking = body as Record<string, unknown>;
    }
  } catch {
    booking = {};
  }

  return NextResponse.json({
    id: "stub-booking",
    status: "pending",
    message: "Booking created",
    booking,
  });
}

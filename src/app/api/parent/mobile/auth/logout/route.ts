/**
 * Parent Mobile Auth — logout.
 * Clears server-side session if applicable.
 */

import { NextResponse } from "next/server";

export async function POST() {
  // TODO: Invalidate token/session if stored server-side
  return NextResponse.json({ ok: true });
}

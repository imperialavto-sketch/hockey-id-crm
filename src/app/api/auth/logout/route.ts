import { NextResponse } from "next/server";
import { getClearSessionCookieHeader } from "@/lib/api-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", getClearSessionCookieHeader());
  return res;
}

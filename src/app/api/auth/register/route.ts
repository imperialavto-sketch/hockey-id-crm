// TEMP DEMO MODE WITHOUT DATABASE
// Mock register - no Prisma, no PostgreSQL. Returns success with provided user data.

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, schoolId } = await req.json().catch(() => ({}));
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Email, password, name, and role required" },
        { status: 400 }
      );
    }
    const user = {
      id: `mock-user-${Date.now()}`,
      email,
      name,
      role,
      schoolId: schoolId || null,
      school: schoolId ? { id: schoolId, name: "Hockey Academy Moscow" } : null,
    };
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

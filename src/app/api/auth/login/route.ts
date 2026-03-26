// Demo auth: hardcoded credentials + optional DB lookup for parentId/teamId (data scope).

import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type DemoUser = {
  id: string;
  name: string;
  role: string;
  schoolId: string | null;
  teamId?: string | null;
  parentId?: string | null;
  school?: { id: string; name: string };
};

const DEMO_USERS: Record<string, DemoUser> = {
  "admin@hockey.edu": {
    id: "demo-admin",
    name: "School Admin",
    role: "SCHOOL_ADMIN",
    schoolId: "demo-school",
    school: { id: "demo-school", name: "Hockey Academy Moscow" },
  },
  "manager@hockey.edu": {
    id: "demo-manager",
    name: "Maria Manager",
    role: "SCHOOL_MANAGER",
    schoolId: "demo-school",
    school: { id: "demo-school", name: "Hockey Academy Moscow" },
  },
  "maincoach@hockey.edu": {
    id: "demo-maincoach",
    name: "Sergei Main Coach",
    role: "MAIN_COACH",
    schoolId: "demo-school",
    school: { id: "demo-school", name: "Hockey Academy Moscow" },
  },
  "coach@hockey.edu": {
    id: "demo-coach",
    name: "Alex Coach",
    role: "COACH",
    schoolId: "demo-school",
    teamId: null, // In real DB: coach's team
    school: { id: "demo-school", name: "Hockey Academy Moscow" },
  },
  "parent@example.com": {
    id: "demo-parent",
    name: "Ivan Petrov",
    role: "PARENT",
    schoolId: "demo-school",
    school: { id: "demo-school", name: "Hockey Academy Moscow" },
  },
};
const DEMO_PASSWORD = "admin123";
const isDemoAuthEnabled = process.env.DEMO_AUTH_ENABLED === "true";

function checkDemoUser(email: string, password: string) {
  if (password !== DEMO_PASSWORD) return null;
  const demo = DEMO_USERS[email.toLowerCase().trim()];
  if (!demo) return null;
  return { user: { ...demo, email: email.toLowerCase().trim() }, role: demo.role };
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const demo = isDemoAuthEnabled
    ? checkDemoUser(String(email), String(password))
    : null;
  if (demo) {
    let parentId = demo.user.parentId ?? null;
    let teamId = demo.user.teamId ?? null;
    let schoolId = demo.user.schoolId;
    try {
      const school = await prisma.school.findFirst({
        where: { name: { contains: "Hockey Academy", mode: "insensitive" } },
      });
      if (school) schoolId = school.id;
    } catch {
      /* DB may be unavailable */
    }
    if (demo.user.role === "PARENT") {
      try {
        const parent = await prisma.parent.findFirst({
          where: { email: String(email).toLowerCase().trim() },
        });
        if (parent) parentId = parent.id;
      } catch {
        /* DB may be unavailable in pure demo mode */
      }
      // Keep parent-compatible token shape even in pure demo mode.
      if (!parentId) parentId = demo.user.id;
    }
    if ((demo.user.role === "COACH" || demo.user.role === "MAIN_COACH") && !teamId && schoolId) {
      try {
        const team = await prisma.team.findFirst({ where: { schoolId } });
        if (team) teamId = team.id;
      } catch {
        /* DB may be unavailable */
      }
    }
    const sessionValue = setSessionCookie({
      id: demo.user.id,
      email: demo.user.email,
      name: demo.user.name,
      role: demo.user.role as "SCHOOL_ADMIN" | "SCHOOL_MANAGER" | "MAIN_COACH" | "COACH" | "PARENT",
      schoolId,
      teamId,
      parentId,
    });
    const res = NextResponse.json({
      user: demo.user,
      role: demo.role,
      mobileToken: sessionValue,
    });
    res.cookies.set("hockey-crm-session", sessionValue, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }
  if (!isDemoAuthEnabled) {
    return NextResponse.json(
      { error: "Demo auth disabled" },
      { status: 403 }
    );
  }
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

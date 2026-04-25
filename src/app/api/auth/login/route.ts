// Auth: optional demo users (DEMO_AUTH_ENABLED=true, non-production only) + real Prisma User credential login (bcrypt).

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSessionCookie, type ApiUser } from "@/lib/api-auth";
import type { UserRole } from "@/lib/rbac";
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
    teamId: null,
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

let demoAuthProductionMisconfigLogged = false;

/** Demo HTTP auth only when `DEMO_AUTH_ENABLED=true` and not production. */
function isDemoAuthEnabledForRequest(): boolean {
  const demoFlag = process.env.DEMO_AUTH_ENABLED === "true";
  const isProduction = process.env.NODE_ENV === "production";
  if (demoFlag && isProduction && !demoAuthProductionMisconfigLogged) {
    demoAuthProductionMisconfigLogged = true;
    console.warn(
      JSON.stringify({
        route: "POST /api/auth/login",
        reason: "demo_auth_disabled_in_production",
        nodeEnv: process.env.NODE_ENV,
        demoAuthFlag: true,
      })
    );
  }
  return demoFlag && !isProduction;
}

function checkDemoUser(email: string, password: string) {
  if (password !== DEMO_PASSWORD) return null;
  const demo = DEMO_USERS[email.toLowerCase().trim()];
  if (!demo) return null;
  return { user: { ...demo, email: email.toLowerCase().trim() }, role: demo.role };
}

/** Coach / CRM mobile: lowercase roles expected by Expo clients. */
function mapUserRoleForMobileApp(role: UserRole): string {
  switch (role) {
    case "COACH":
      return "coach";
    case "MAIN_COACH":
      return "main_coach";
    case "SCHOOL_ADMIN":
      return "school_admin";
    case "SCHOOL_MANAGER":
      return "school_manager";
    case "EXTERNAL_COACH":
      return "external_coach";
    case "PARENT":
      return "parent";
    default:
      return String(role).toLowerCase();
  }
}

function jsonSessionUser(api: ApiUser, mobileRole: string) {
  return {
    id: api.id,
    email: api.email ?? "",
    name: api.name ?? "",
    role: mobileRole,
    schoolId: api.schoolId,
    teamId: api.teamId ?? null,
    parentId: api.parentId ?? null,
  };
}

async function buildDemoSessionResponse(
  demo: NonNullable<ReturnType<typeof checkDemoUser>>,
  emailNorm: string
) {
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
        where: { email: emailNorm },
      });
      if (parent) parentId = parent.id;
    } catch {
      /* DB may be unavailable in pure demo mode */
    }
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
  if (demo.user.role === "COACH" || demo.user.role === "MAIN_COACH") {
    try {
      const u = await prisma.user.findUnique({
        where: { email: emailNorm },
        select: { teamId: true, schoolId: true },
      });
      if (u?.schoolId) schoolId = u.schoolId;
      if (u?.teamId) teamId = u.teamId;
    } catch {
      /* DB may be unavailable */
    }
  }

  const sessionPayload: ApiUser = {
    id: demo.user.id,
    email: demo.user.email,
    name: demo.user.name,
    role: demo.user.role as ApiUser["role"],
    schoolId,
    teamId,
    parentId,
  };
  const sessionValue = setSessionCookie(sessionPayload);
  const mobileRole = mapUserRoleForMobileApp(sessionPayload.role);

  const body: Record<string, unknown> = {
    user: { ...demo.user, email: demo.user.email, role: mobileRole },
    role: demo.role,
    mobileToken: sessionValue,
  };
  if (sessionPayload.role === "PARENT") {
    body.token = sessionValue;
    body.parent = {
      id: String(parentId ?? demo.user.id),
      email: demo.user.email,
    };
  }

  const res = NextResponse.json(body);
  res.cookies.set("hockey-crm-session", sessionValue, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/**
 * Real DB login: `User.password` is bcrypt (see prisma/seed, /api/users).
 * PARENT sessions use `Parent.id` as Bearer identity (same as mobile verify).
 */
async function tryDatabaseCredentialLogin(
  emailNorm: string,
  password: string
): Promise<NextResponse | null> {
  const dbUser = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
      schoolId: true,
      teamId: true,
    },
  });

  if (!dbUser?.password) return null;

  const ok = await bcrypt.compare(String(password), dbUser.password).catch(() => false);
  if (!ok) return null;

  let parentId: string | null = null;
  let sessionId = dbUser.id;

  if (dbUser.role === "PARENT") {
    const parent = await prisma.parent.findFirst({
      where: { email: emailNorm },
    });
    if (!parent) {
      return NextResponse.json(
        {
          error:
            "Профиль родителя не найден. Войдите по телефону или обратитесь в школу.",
          code: "PARENT_PROFILE_MISSING",
        },
        { status: 403 }
      );
    }
    parentId = parent.id;
    sessionId = parent.id;
  }

  const sessionPayload: ApiUser = {
    id: sessionId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    schoolId: dbUser.schoolId ?? null,
    teamId: dbUser.teamId ?? null,
    parentId,
  };

  const sessionValue = setSessionCookie(sessionPayload);
  const mobileRole = mapUserRoleForMobileApp(dbUser.role);

  const clientUser = jsonSessionUser(sessionPayload, mobileRole);

  const body: Record<string, unknown> = {
    user: clientUser,
    role: dbUser.role,
    mobileToken: sessionValue,
  };

  if (dbUser.role === "PARENT") {
    body.token = sessionValue;
    body.parent = { id: parentId!, email: dbUser.email };
  }

  const res = NextResponse.json(body);
  res.cookies.set("hockey-crm-session", sessionValue, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const emailNorm = String(email).toLowerCase().trim();

  if (isDemoAuthEnabledForRequest()) {
    const demo = checkDemoUser(emailNorm, String(password));
    if (demo) {
      return buildDemoSessionResponse(demo, emailNorm);
    }
  }

  try {
    const dbRes = await tryDatabaseCredentialLogin(emailNorm, String(password));
    if (dbRes) return dbRes;
  } catch (e) {
    console.error("[auth][login] database login error:", e);
    return NextResponse.json(
      { error: "Не удалось выполнить вход" },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

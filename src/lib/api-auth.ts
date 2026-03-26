/**
 * API Authorization — server-side auth for API routes.
 * Reads session from cookie, validates role for protected endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { UserRole } from "./rbac";

const SESSION_COOKIE = "hockey-crm-session";

export interface ApiUser {
  id: string;
  email?: string;
  name?: string;
  role: UserRole;
  schoolId: string | null;
  teamId?: string | null;
  /** Для PARENT — ID записи Parent для data scope */
  parentId?: string | null;
}

/**
 * x-parent-id: DEPRECATED for auth. Do NOT trust as identity.
 * Kept for backward compat in logging/audit only. Auth must use Bearer/cookie.
 */
export const PARENT_ID_HEADER = "x-parent-id";

function parseSessionToken(raw: string): ApiUser | null {
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(
      Buffer.from(raw.trim(), "base64url").toString("utf-8")
    ) as ApiUser;
    if (!data?.id || !data?.role) return null;
    const validRoles: UserRole[] = [
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "MAIN_COACH",
      "COACH",
      "PARENT",
    ];
    if (!validRoles.includes(data.role as UserRole)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getAuthFromRequest(
  req: NextRequest
): Promise<ApiUser | null> {
  // Bearer token (coach app, parent mobile) — primary auth source
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const user = parseSessionToken(token);
    if (user) return user;
  }

  // Session cookie (web CRM)
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return parseSessionToken(raw);
}

/** Create session token for parent (e.g. after verify). Same format as parseSessionToken expects. */
export function createParentSessionToken(parentId: string): string {
  const payload = JSON.stringify({
    id: parentId,
    role: "PARENT",
    schoolId: null,
    parentId,
  });
  return Buffer.from(payload, "utf-8").toString("base64url");
}

export function setSessionCookie(user: ApiUser): string {
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId ?? null,
    teamId: user.teamId ?? null,
    parentId: user.parentId ?? null,
  });
  return Buffer.from(payload, "utf-8").toString("base64url");
}

export function getClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function forbiddenResponse(message = "Доступ запрещён"): NextResponse {
  return NextResponse.json(
    { error: message, code: "FORBIDDEN" },
    { status: 403 }
  );
}

export function unauthorizedResponse(
  message = "Необходима авторизация"
): NextResponse {
  return NextResponse.json(
    { error: message, code: "UNAUTHORIZED" },
    { status: 401 }
  );
}

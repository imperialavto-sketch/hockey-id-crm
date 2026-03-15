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

/** Parent Mobile: header for identifying parent (when no session cookie). */
export const PARENT_ID_HEADER = "x-parent-id";

export async function getAuthFromRequest(
  req: NextRequest
): Promise<ApiUser | null> {
  const parentIdHeader = req.headers.get(PARENT_ID_HEADER);
  if (parentIdHeader?.trim()) {
    return {
      id: parentIdHeader.trim(),
      role: "PARENT",
      schoolId: null,
      parentId: parentIdHeader.trim(),
    };
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const data = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf-8")
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

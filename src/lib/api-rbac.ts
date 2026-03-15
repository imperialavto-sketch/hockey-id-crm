/**
 * API RBAC — проверки ролей для защищённых endpoints.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthFromRequest,
  forbiddenResponse,
  unauthorizedResponse,
} from "./api-auth";
import {
  type UserRole,
  canViewModule,
  PERMISSIONS,
  type Module,
} from "./rbac";

export type ApiAction = "view" | "create" | "edit" | "delete";

/** Module name used in API path (e.g. players, teams) */
export type ApiModule =
  | "players"
  | "teams"
  | "coaches"
  | "trainings"
  | "payments"
  | "analytics"
  | "messages"
  | "settings"
  | "dashboard"
  | "schools";

const API_TO_MODULE: Record<ApiModule, Module> = {
  players: "players",
  teams: "teams",
  coaches: "coaches",
  trainings: "schedule",
  payments: "finance",
  analytics: "analytics",
  messages: "communications",
  settings: "settings",
  dashboard: "dashboard",
  schools: "school",
};

/**
 * Requires authenticated user. Returns 401 if not authenticated.
 */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthFromRequest(req);
  if (!user) return { user: null, res: unauthorizedResponse() };
  return { user, res: null };
}

/**
 * Requires user to have at least one of the given roles.
 * Returns 403 if unauthorized.
 */
export async function requireRoles(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<
  | { user: Awaited<ReturnType<typeof getAuthFromRequest>>; res: null }
  | { user: null; res: NextResponse }
> {
  const { user, res } = await requireAuth(req);
  if (res) return { user: null, res };
  if (!user || !allowedRoles.includes(user.role)) {
    return { user: null, res: forbiddenResponse("Недостаточно прав") };
  }
  return { user, res: null };
}

/**
 * Requires CRM role (no PARENT). PARENT must use /api/parent/* only.
 */
export async function requireCrmRole(req: NextRequest) {
  return requireRoles(req, [
    "SCHOOL_ADMIN",
    "SCHOOL_MANAGER",
    "MAIN_COACH",
    "COACH",
  ]);
}

/**
 * Requires PARENT role. For /api/parent/* endpoints.
 */
export async function requireParentRole(req: NextRequest) {
  return requireRoles(req, ["PARENT"]);
}

/**
 * Requires permission for API module and action.
 */
export async function requirePermission(
  req: NextRequest,
  apiModule: ApiModule,
  action: ApiAction
): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getAuthFromRequest>>>; res: null }
  | { user: null; res: NextResponse }
> {
  const { user, res } = await requireCrmRole(req);
  if (res) return { user: null, res };

  const mod = API_TO_MODULE[apiModule];
  const perms = PERMISSIONS[user!.role][mod];
  if (!perms) return { user: null, res: forbiddenResponse() };

  const allowed =
    action === "view"
      ? perms.view
      : action === "create"
        ? perms.create
        : action === "edit"
          ? perms.edit
          : perms.delete;

  if (!allowed) return { user: null, res: forbiddenResponse("Недостаточно прав") };
  return { user: user!, res: null };
}

/**
 * Check if user can access finance (COACH cannot).
 */
export function canAccessFinance(role: UserRole): boolean {
  return PERMISSIONS[role].finance.view;
}

/**
 * Check if user can access settings (only SCHOOL_ADMIN full, SCHOOL_MANAGER limited).
 */
export function canAccessSettings(role: UserRole): boolean {
  return (
    PERMISSIONS[role].settings.view ||
    role === "SCHOOL_ADMIN" ||
    role === "SCHOOL_MANAGER"
  );
}

/**
 * RBAC — Role-Based Access Control
 * Централизованная карта прав доступа для CRM школы.
 */

export type UserRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "MAIN_COACH"
  | "COACH"
  | "PARENT";

export type Module =
  | "dashboard"
  | "school"
  | "teams"
  | "players"
  | "coaches"
  | "schedule"
  | "finance"
  | "analytics"
  | "communications"
  | "marketplace"
  | "settings";

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

const PERMISSIONS: Record<UserRole, Record<Module, ModulePermissions>> = {
  SCHOOL_ADMIN: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    school: { view: true, create: true, edit: true, delete: true },
    teams: { view: true, create: true, edit: true, delete: true },
    players: { view: true, create: true, edit: true, delete: true },
    coaches: { view: true, create: true, edit: true, delete: true },
    schedule: { view: true, create: true, edit: true, delete: true },
    finance: { view: true, create: true, edit: true, delete: true },
    analytics: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    marketplace: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
  },
  SCHOOL_MANAGER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    school: { view: true, create: false, edit: true, delete: false },
    teams: { view: true, create: true, edit: true, delete: false },
    players: { view: true, create: true, edit: true, delete: true },
    coaches: { view: true, create: false, edit: false, delete: false },
    schedule: { view: true, create: true, edit: true, delete: true },
    finance: { view: true, create: true, edit: true, delete: false },
    analytics: { view: true, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: true, delete: false },
    marketplace: { view: true, create: true, edit: true, delete: false },
    settings: { view: true, create: false, edit: true, delete: false }, // limited: no roles/system
  },
  MAIN_COACH: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    school: { view: true, create: false, edit: false, delete: false },
    teams: { view: true, create: true, edit: true, delete: false },
    players: { view: true, create: true, edit: true, delete: false },
    coaches: { view: true, create: true, edit: true, delete: false },
    schedule: { view: true, create: true, edit: true, delete: true },
    finance: { view: true, create: false, edit: false, delete: false }, // view only, or team-scoped
    analytics: { view: true, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: true, delete: false }, // team-scoped
    marketplace: { view: true, create: true, edit: true, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
  COACH: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    school: { view: false, create: false, edit: false, delete: false },
    teams: { view: true, create: false, edit: false, delete: false }, // own teams only
    players: { view: true, create: false, edit: true, delete: false }, // own team players
    coaches: { view: true, create: false, edit: false, delete: false },
    schedule: { view: true, create: true, edit: true, delete: false }, // own trainings
    finance: { view: false, create: false, edit: false, delete: false },
    analytics: { view: true, create: false, edit: false, delete: false }, // team-scoped
    communications: { view: true, create: true, edit: false, delete: false }, // own players
    marketplace: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
  PARENT: {
    dashboard: { view: false, create: false, edit: false, delete: false },
    school: { view: false, create: false, edit: false, delete: false },
    teams: { view: false, create: false, edit: false, delete: false },
    players: { view: false, create: false, edit: false, delete: false },
    coaches: { view: false, create: false, edit: false, delete: false },
    schedule: { view: false, create: false, edit: false, delete: false },
    finance: { view: false, create: false, edit: false, delete: false },
    analytics: { view: false, create: false, edit: false, delete: false },
    communications: { view: false, create: false, edit: false, delete: false },
    marketplace: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
};

/** Path to module mapping for route protection */
export const PATH_TO_MODULE: Record<string, Module> = {
  "/dashboard": "dashboard",
  "/schools": "school",
  "/teams": "teams",
  "/players": "players",
  "/player": "players",
  "/coaches": "coaches",
  "/schedule": "schedule",
  "/trainings": "schedule",
  "/finance": "finance",
  "/analytics": "analytics",
  "/ratings": "analytics",
  "/communications": "communications",
  "/feed": "schedule",
  "/marketplace": "marketplace",
  "/settings": "settings",
  "/coach": "schedule",
};

/** Modules that PARENT must never access (redirect to /parent) */
export const PARENT_FORBIDDEN_PATHS = [
  "/dashboard",
  "/schools",
  "/teams",
  "/players",
  "/player",
  "/coaches",
  "/schedule",
  "/trainings",
  "/finance",
  "/analytics",
  "/ratings",
  "/communications",
  "/feed",
  "/marketplace",
  "/settings",
  "/coach",
];

/** Nav items per role. PARENT gets only /parent. */
export const NAV_BY_ROLE: Record<UserRole, { href: string; module?: Module }[]> = {
  SCHOOL_ADMIN: [
    { href: "/dashboard", module: "dashboard" },
    { href: "/schools", module: "school" },
    { href: "/teams", module: "teams" },
    { href: "/players", module: "players" },
    { href: "/ratings", module: "analytics" },
    { href: "/coaches", module: "coaches" },
    { href: "/schedule", module: "schedule" },
    { href: "/feed", module: "schedule" },
    { href: "/marketplace", module: "marketplace" },
    { href: "/finance", module: "finance" },
    { href: "/analytics", module: "analytics" },
    { href: "/communications", module: "communications" },
    { href: "/settings", module: "settings" },
  ],
  SCHOOL_MANAGER: [
    { href: "/dashboard", module: "dashboard" },
    { href: "/schools", module: "school" },
    { href: "/teams", module: "teams" },
    { href: "/players", module: "players" },
    { href: "/ratings", module: "analytics" },
    { href: "/coaches", module: "coaches" },
    { href: "/schedule", module: "schedule" },
    { href: "/feed", module: "schedule" },
    { href: "/marketplace", module: "marketplace" },
    { href: "/finance", module: "finance" },
    { href: "/analytics", module: "analytics" },
    { href: "/communications", module: "communications" },
    { href: "/settings", module: "settings" },
  ],
  MAIN_COACH: [
    { href: "/dashboard", module: "dashboard" },
    { href: "/teams", module: "teams" },
    { href: "/players", module: "players" },
    { href: "/ratings", module: "analytics" },
    { href: "/coaches", module: "coaches" },
    { href: "/schedule", module: "schedule" },
    { href: "/feed", module: "schedule" },
    { href: "/marketplace", module: "marketplace" },
    { href: "/finance", module: "finance" },
    { href: "/analytics", module: "analytics" },
    { href: "/communications", module: "communications" },
  ],
  COACH: [
    { href: "/dashboard", module: "dashboard" },
    { href: "/teams", module: "teams" },
    { href: "/players", module: "players" },
    { href: "/ratings", module: "analytics" },
    { href: "/coaches", module: "coaches" },
    { href: "/schedule", module: "schedule" },
    { href: "/feed", module: "schedule" },
    { href: "/analytics", module: "analytics" },
    { href: "/communications", module: "communications" },
  ],
  PARENT: [{ href: "/parent" }],
};

// --- Helpers ---

export function getCurrentUserRole(role: string | undefined): UserRole | null {
  if (!role) return null;
  const r = role as UserRole;
  return PERMISSIONS[r] ? r : null;
}

export function requireRole(
  role: string | undefined,
  allowed: UserRole[]
): boolean {
  const r = getCurrentUserRole(role);
  return r !== null && allowed.includes(r);
}

export function canViewModule(role: string | undefined, module: Module): boolean {
  const r = getCurrentUserRole(role);
  if (!r) return false;
  return PERMISSIONS[r][module]?.view ?? false;
}

export function canCreateModule(role: string | undefined, module: Module): boolean {
  const r = getCurrentUserRole(role);
  if (!r) return false;
  return PERMISSIONS[r][module]?.create ?? false;
}

export function canEditModule(role: string | undefined, module: Module): boolean {
  const r = getCurrentUserRole(role);
  if (!r) return false;
  return PERMISSIONS[r][module]?.edit ?? false;
}

export function canDeleteModule(role: string | undefined, module: Module): boolean {
  const r = getCurrentUserRole(role);
  if (!r) return false;
  return PERMISSIONS[r][module]?.delete ?? false;
}

export function getModuleFromPath(pathname: string): Module | null {
  for (const [path, module] of Object.entries(PATH_TO_MODULE)) {
    if (pathname === path || pathname.startsWith(path + "/")) return module;
  }
  return null;
}

export function isParentForbiddenPath(pathname: string): boolean {
  return PARENT_FORBIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function getNavForRole(role: string | undefined): { href: string; module?: Module }[] {
  const r = getCurrentUserRole(role);
  if (!r) return NAV_BY_ROLE.SCHOOL_ADMIN;
  return NAV_BY_ROLE[r];
}

export { PERMISSIONS };

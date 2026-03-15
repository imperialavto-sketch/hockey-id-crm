"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  canViewModule,
  canCreateModule,
  canEditModule,
  canDeleteModule,
  getNavForRole,
  getModuleFromPath,
  type Module,
} from "@/lib/rbac";

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return useMemo(
    () => ({
      role,
      canView: (module: Module) => canViewModule(role, module),
      canCreate: (module: Module) => canCreateModule(role, module),
      canEdit: (module: Module) => canEditModule(role, module),
      canDelete: (module: Module) => canDeleteModule(role, module),
      navItems: getNavForRole(role),
      getModuleFromPath,
    }),
    [role]
  );
}

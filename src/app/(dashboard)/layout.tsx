"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { isParentForbiddenPath, canViewModule, getModuleFromPath } from "@/lib/rbac";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");

    // PARENT: redirect from all CRM pages to /parent
    if (user.role === "PARENT" && path !== "/parent" && isParentForbiddenPath(path)) {
      router.replace("/parent");
      return;
    }

    // CRM roles: check module access for direct navigation
    if (user.role !== "PARENT" && path !== "/parent") {
      const mod = getModuleFromPath(path);
      if (mod && !canViewModule(user.role, mod)) {
        router.replace("/dashboard");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar />
      <main className="min-h-screen pl-0 pt-16 lg:pl-64 lg:pt-0">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutInner>{children}</DashboardLayoutInner>;
}

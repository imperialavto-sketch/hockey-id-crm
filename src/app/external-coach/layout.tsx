"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function ExternalCoachShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (user.role !== "EXTERNAL_COACH") {
      router.replace(user.role === "PARENT" ? "/parent" : "/dashboard");
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || user.role !== "EXTERNAL_COACH") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/60 border-t-transparent" />
      </div>
    );
  }

  return <div className="min-h-screen bg-dark-900 text-slate-200">{children}</div>;
}

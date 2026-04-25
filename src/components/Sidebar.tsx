"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  GraduationCap,
  Calendar,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Building2,
  Trophy,
  Newspaper,
  Store,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getNavForRole } from "@/lib/rbac";

const LABEL_MAP: Record<string, string> = {
  "/dashboard": "Главная",
  "/schools": "Школа",
  "/teams": "Команды",
  "/players": "Игроки",
  "/ratings": "Рейтинг",
  "/coaches": "Тренеры",
  "/schedule": "Расписание",
  "/finance": "Финансы",
  "/analytics": "Аналитика",
  "/communications": "Сообщения",
  "/feed": "Лента",
  "/marketplace": "Маркетплейс тренеров",
  "/settings": "Настройки",
  "/parent": "Мои дети",
  "/external-coach/requests": "Запросы",
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/schools": Building2,
  "/teams": Users,
  "/players": UserCircle,
  "/ratings": Trophy,
  "/coaches": GraduationCap,
  "/schedule": Calendar,
  "/finance": Wallet,
  "/analytics": BarChart3,
  "/communications": MessageSquare,
  "/feed": Newspaper,
  "/marketplace": Store,
  "/settings": Settings,
  "/parent": UserCircle,
  "/external-coach/requests": ClipboardList,
};

const roleLabels: Record<string, string> = {
  SCHOOL_ADMIN: "Администратор",
  MAIN_COACH: "Главный тренер",
  COACH: "Тренер",
  SCHOOL_MANAGER: "Менеджер школы",
  PARENT: "Родитель",
  EXTERNAL_COACH: "Внешний тренер",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-pink font-display text-lg font-bold text-white shadow-[0_0_20px_rgba(0,212,255,0.5)]">
          H
        </div>
        <span className="font-display text-xl font-bold tracking-wide text-white">
          Hockey ID
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 p-4">
        {getNavForRole(user?.role).map((item) => {
          const Icon = ICON_MAP[item.href] ?? LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-neon-blue/20 text-neon-blue shadow-[0_0_15px_rgba(0,212,255,0.3)] border border-neon-blue/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white hover:border hover:border-white/10"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive ? "text-neon-blue" : "text-slate-500 group-hover:text-neon-blue"
                )}
              />
              {LABEL_MAP[item.href] ?? item.href}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-xl bg-white/5 px-3 py-2.5 border border-white/10">
          <p className="text-xs font-medium text-slate-500">Вы вошли как</p>
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="text-xs text-neon-blue">{user?.role ? roleLabels[user.role] ?? user.role : ""}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-all duration-300 hover:bg-neon-pink/10 hover:text-neon-pink border border-transparent hover:border-neon-pink/30"
        >
          <LogOut className="h-5 w-5" />
          Выйти
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl glass border border-neon-blue/30 text-neon-blue shadow-neon-blue lg:hidden"
        aria-label="Открыть меню"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 glass border-r border-white/10 transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <NavContent />
        </div>
      </aside>
    </>
  );
}

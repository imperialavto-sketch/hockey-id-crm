"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCircle,
  Users,
  GraduationCap,
  Calendar,
  MapPin,
  TrendingUp,
  Wallet,
  AlertCircle,
  Star,
  ChevronRight,
  Loader2,
  Plus,
  BarChart3,
  UserPlus,
  CalendarPlus,
  MessageSquare,
  Zap,
} from "lucide-react";
import { Card } from "@/components/Card";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create_player: UserPlus,
  create_training: CalendarPlus,
  payment_updated: Wallet,
  rating_added: Star,
  recommendation_added: MessageSquare,
  create_team: Users,
  create_coach: GraduationCap,
};

const ACTIVITY_LABELS: Record<string, string> = {
  create_player: "Новый игрок",
  create_training: "Новая тренировка",
  payment_updated: "Изменён платёж",
  rating_added: "Оценка игроку",
  recommendation_added: "Рекомендация",
  create_team: "Новая команда",
  create_coach: "Новый тренер",
};

const ROLE_LABELS: Record<string, string> = {
  SCHOOL_ADMIN: "Администратор",
  SCHOOL_MANAGER: "Менеджер",
  MAIN_COACH: "Главный тренер",
  COACH: "Тренер",
};

interface Summary {
  playersCount: number;
  teamsCount: number;
  coachesCount: number;
  trainingsThisMonth: number;
  avgAttendance: number;
  paidAmount: number;
  debtAmount: number;
  recommendationsCount: number;
}

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  team?: { name: string; coach?: { firstName: string; lastName: string } | null } | null;
}

interface ActivityLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { canCreate, canView } = usePermissions();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/summary").then((r) => r.json()),
      fetch("/api/dashboard/upcoming-trainings").then((r) => r.json()),
      fetch("/api/dashboard/recent-activity").then((r) => r.json()),
    ])
      .then(([s, t, a]) => {
        setSummary(s);
        setTrainings(Array.isArray(t) ? t : []);
        setActivity(Array.isArray(a) ? a : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
      </div>
    );
  }

  const s = summary ?? {
    playersCount: 0,
    teamsCount: 0,
    coachesCount: 0,
    trainingsThisMonth: 0,
    avgAttendance: 0,
    paidAmount: 0,
    debtAmount: 0,
    recommendationsCount: 0,
  };

  const totalPayments = (s.paidAmount ?? 0) + (s.debtAmount ?? 0);
  const paymentPct = totalPayments > 0 ? Math.round(((s.paidAmount ?? 0) / totalPayments) * 100) : 0;

  const quickActions = [
    { href: "/players/new", label: "Добавить игрока", icon: UserPlus, mod: "players" as const, needCreate: true },
    { href: "/teams/new", label: "Создать команду", icon: Users, mod: "teams" as const, needCreate: true },
    { href: "/trainings/new", label: "Создать тренировку", icon: CalendarPlus, mod: "schedule" as const, needCreate: true },
    { href: "/finance", label: "Начислить оплаты", icon: Wallet, mod: "finance" as const, needCreate: false },
    { href: "/analytics", label: "Открыть аналитику", icon: BarChart3, mod: "analytics" as const, needCreate: false },
  ].filter((a) => (a.needCreate ? canCreate(a.mod) : canView(a.mod)));

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Hero */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              С возвращением, {user?.name?.split(" ")[0] ?? "Администратор"}
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Обзор вашей хоккейной школы
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </p>
              <p className="text-sm font-medium text-white">
                {new Date().toLocaleDateString("ru-RU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-neon-blue/20 p-5 transition-all duration-300 hover:border-neon-blue/50 hover:shadow-[0_0_30px_rgba(0,212,255,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Игроки</p>
                <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{s.playersCount}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-blue/15 backdrop-blur-sm">
                <UserCircle className="h-5 w-5 text-neon-blue sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-neon-pink/20 p-5 transition-all duration-300 hover:border-neon-pink/50 hover:shadow-[0_0_30px_rgba(255,0,170,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Команды</p>
                <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{s.teamsCount}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-pink/15 backdrop-blur-sm">
                <Users className="h-5 w-5 text-neon-pink sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-neon-cyan/20 p-5 transition-all duration-300 hover:border-neon-cyan/50 hover:shadow-[0_0_30px_rgba(0,245,255,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Тренеры</p>
                <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{s.coachesCount}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-cyan/15 backdrop-blur-sm">
                <GraduationCap className="h-5 w-5 text-neon-cyan sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-neon-purple/20 p-5 transition-all duration-300 hover:border-neon-purple/50 hover:shadow-[0_0_30px_rgba(191,0,255,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Тренировки</p>
                <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                  {s.trainingsThisMonth}
                  <span className="text-lg font-normal text-slate-500 sm:text-xl"> / мес.</span>
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-purple/15 backdrop-blur-sm">
                <Calendar className="h-5 w-5 text-neon-purple sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-neon-green/20 p-5 transition-all duration-300 hover:border-neon-green/50 hover:shadow-[0_0_30px_rgba(0,255,136,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Посещаемость</p>
                <p className="mt-2 font-display text-2xl font-bold text-neon-green sm:text-3xl">{s.avgAttendance}%</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-green/15 backdrop-blur-sm">
                <TrendingUp className="h-5 w-5 text-neon-green sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-neon-green/20 p-5 transition-all duration-300 hover:border-neon-green/50 hover:shadow-[0_0_30px_rgba(0,255,136,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Оплачено</p>
                <p className="mt-2 font-display text-xl font-bold text-neon-green sm:text-2xl">
                  {s.paidAmount?.toLocaleString("ru")}
                  <span className="text-base font-normal text-slate-500 sm:text-lg"> ₽</span>
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-green/15 backdrop-blur-sm">
                <Wallet className="h-5 w-5 text-neon-green sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-amber-500/20 p-5 transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Задолженность</p>
                <p className="mt-2 font-display text-xl font-bold text-amber-400 sm:text-2xl">
                  {s.debtAmount?.toLocaleString("ru")}
                  <span className="text-base font-normal text-slate-500 sm:text-lg"> ₽</span>
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 backdrop-blur-sm">
                <AlertCircle className="h-5 w-5 text-amber-400 sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
          <Card className="group flex min-h-[150px] flex-col justify-between overflow-hidden rounded-2xl border-neon-pink/20 p-5 transition-all duration-300 hover:border-neon-pink/50 hover:shadow-[0_0_30px_rgba(255,0,170,0.12)] sm:p-6">
            <div className="flex flex-1 items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Рекомендации</p>
                <p className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{s.recommendationsCount}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-pink/15 backdrop-blur-sm">
                <Star className="h-5 w-5 text-neon-pink sm:h-6 sm:w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Ближайшие тренировки */}
          <Card className="overflow-hidden rounded-2xl border-white/10">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-white sm:text-lg">
                  Ближайшие тренировки
                </h2>
                <Link
                  href="/schedule"
                  className="inline-flex items-center gap-1 text-sm font-medium text-neon-blue transition-colors hover:text-neon-cyan"
                >
                  Расписание <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              {trainings.length > 0 ? (
                <div className="space-y-3">
                  {trainings.map((t) => {
                    const d = new Date(t.startTime);
                    return (
                      <Link
                        key={t.id}
                        href={`/trainings/${t.id}`}
                        className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-neon-blue/30 hover:bg-neon-blue/5"
                      >
                        <div className="flex shrink-0 flex-col items-center rounded-lg bg-neon-blue/10 px-3 py-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            {d.toLocaleDateString("ru-RU", { weekday: "short" })}
                          </span>
                          <span className="font-display text-lg font-bold text-neon-blue">
                            {d.getDate()}
                          </span>
                          <span className="text-xs text-slate-500">
                            {d.toLocaleDateString("ru-RU", { month: "short" })}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{t.title}</p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            {t.team?.name ?? "—"}
                          </p>
                          {t.team?.coach && (
                            <p className="text-xs text-slate-600">
                              {t.team.coach.firstName} {t.team.coach.lastName}
                            </p>
                          )}
                          {t.location && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5" />
                              {t.location}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-500">Ближайших тренировок нет</p>
                </div>
              )}
            </div>
          </Card>

          {/* Последние действия */}
          <Card className="overflow-hidden rounded-2xl border-white/10">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-white sm:text-lg">
                  Последние действия
                </h2>
                <Link
                  href="/analytics"
                  className="inline-flex items-center gap-1 text-sm font-medium text-neon-blue transition-colors hover:text-neon-cyan"
                >
                  Аналитика <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-4 sm:p-5">
              {activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.slice(0, 10).map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] ?? Zap;
                    return (
                      <div
                        key={a.id}
                        className="flex gap-3 rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:border-white/10"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neon-blue/20 bg-neon-blue/10">
                          <Icon className="h-4 w-4 text-neon-blue" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">
                            {ACTIVITY_LABELS[a.type] ?? a.type}
                          </p>
                          <p className="text-xs text-slate-500">{a.message}</p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {formatRelativeTime(a.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Zap className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-500">Пока нет активности</p>
                </div>
              )}
            </div>
          </Card>

          {/* Финансовая сводка */}
          <Card className="rounded-2xl border-white/10">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <h2 className="font-display text-base font-semibold text-white sm:text-lg">
                Финансы
              </h2>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Оплачено за месяц</span>
                <span className="font-mono font-semibold text-neon-green">
                  {s.paidAmount?.toLocaleString("ru")} ₽
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Задолженность</span>
                <span className="font-mono font-semibold text-amber-400">
                  {s.debtAmount?.toLocaleString("ru")} ₽
                </span>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Доля оплат</span>
                  <span>{paymentPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon-green to-emerald-400 transition-all duration-500"
                    style={{ width: `${paymentPct}%` }}
                  />
                </div>
              </div>
              <Link
                href="/finance"
                className="mt-2 block text-center text-sm font-medium text-neon-blue hover:text-neon-cyan"
              >
                Перейти в финансы →
              </Link>
            </div>
          </Card>

          {/* Рекомендации тренеров */}
          <Card className="rounded-2xl border-white/10">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <h2 className="font-display text-base font-semibold text-white sm:text-lg">
                Рекомендации тренеров
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon-pink/15">
                    <Star className="h-6 w-6 text-neon-pink" />
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-white">
                      {s.recommendationsCount}
                    </p>
                    <p className="text-sm text-slate-500">рекомендаций в этом месяце</p>
                  </div>
                </div>
                <Link
                  href="/analytics"
                  className="text-sm font-medium text-neon-blue hover:text-neon-cyan"
                >
                  Смотреть
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Быстрые действия */}
        <div>
          <h2 className="mb-4 font-display text-base font-semibold text-white sm:text-lg">
            Быстрые действия
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {quickActions.map(({ href, label, icon: Icon }, idx) => {
              const colors = [
                "border-neon-blue/30 hover:border-neon-blue/60 hover:bg-neon-blue/10 hover:shadow-[0_0_20px_rgba(0,212,255,0.15)]",
                "border-neon-pink/30 hover:border-neon-pink/60 hover:bg-neon-pink/10 hover:shadow-[0_0_20px_rgba(255,0,170,0.15)]",
                "border-neon-purple/30 hover:border-neon-purple/60 hover:bg-neon-purple/10 hover:shadow-[0_0_20px_rgba(191,0,255,0.15)]",
                "border-neon-green/30 hover:border-neon-green/60 hover:bg-neon-green/10 hover:shadow-[0_0_20px_rgba(0,255,136,0.15)]",
                "border-neon-cyan/30 hover:border-neon-cyan/60 hover:bg-neon-cyan/10 hover:shadow-[0_0_20px_rgba(0,245,255,0.15)]",
              ];
              const iconColors = [
                "text-neon-blue",
                "text-neon-pink",
                "text-neon-purple",
                "text-neon-green",
                "text-neon-cyan",
              ];
              const c = colors[idx % colors.length];
              const ic = iconColors[idx % iconColors.length];
              return (
                <Link
                  key={label}
                  href={href}
                  className={`group flex items-center gap-3 rounded-xl border bg-white/5 px-4 py-3 transition-all duration-300 ${c}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/20">
                    <Icon className={`h-5 w-5 ${ic}`} />
                  </div>
                  <span className="font-medium text-white">{label}</span>
                </Link>
              );
            })}
          </div>
          {quickActions.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 py-8 text-center text-sm text-slate-500">
              Нет доступных быстрых действий
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

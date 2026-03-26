"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
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
  UserPlus,
  BarChart3,
  CalendarPlus,
  MessageSquare,
  Zap,
  Clock,
} from "lucide-react";
import { Card } from "@/components/Card";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { CRM_DASHBOARD_COPY } from "@/lib/crmDashboardCopy";

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
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

async function parseOkJson(r: Response): Promise<unknown> {
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error("fetch failed");
  return data;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function PanelHeader({
  kicker,
  title,
  hint,
  action,
}: {
  kicker?: string;
  title: string;
  hint?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {kicker ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{kicker}</p>
          ) : null}
          <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{hint}</p> : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-neon-blue"
          >
            {action.label}
            <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function DashboardStatCard({
  label,
  children,
  icon: Icon,
  href,
  canNavigate,
}: {
  label: string;
  children: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  canNavigate?: boolean;
}) {
  const inner = (
    <Card className="group flex min-h-[128px] flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.03] sm:min-h-[140px] sm:p-6">
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="mt-2 min-w-0 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{children}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-500 transition-colors group-hover:border-white/[0.12] group-hover:text-slate-300">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </Card>
  );
  if (href && canNavigate) {
    return (
      <Link href={href} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { canCreate, canView } = usePermissions();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    Promise.all([
      fetch("/api/dashboard/summary").then(parseOkJson),
      fetch("/api/dashboard/upcoming-trainings").then(parseOkJson),
      fetch("/api/dashboard/recent-activity").then(parseOkJson),
    ])
      .then(([s, t, a]) => {
        setSummary(s as Summary);
        setTrainings(Array.isArray(t) ? (t as Training[]) : []);
        setActivity(Array.isArray(a) ? (a as ActivityLog[]) : []);
        setFetchError(false);
      })
      .catch(() => {
        setFetchError(true);
        setSummary(null);
        setTrainings([]);
        setActivity([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <Card className="rounded-2xl border-white/[0.08] p-0">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_DASHBOARD_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_DASHBOARD_COPY.loadingHint}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_DASHBOARD_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_DASHBOARD_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_DASHBOARD_COPY.retryCta}
            </button>
          </div>
          <p className="text-sm text-slate-500">{CRM_DASHBOARD_COPY.errorRecoverHint}</p>
        </div>
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

  const firstName = user?.name?.split(" ")[0] ?? CRM_DASHBOARD_COPY.heroGreetingFallback;

  const hubLinks = [
    { href: "/schedule", label: CRM_DASHBOARD_COPY.hubNavSchedule, mod: "schedule" as const },
    { href: "/trainings", label: CRM_DASHBOARD_COPY.hubNavTrainings, mod: "schedule" as const },
    { href: "/teams", label: CRM_DASHBOARD_COPY.hubNavTeams, mod: "teams" as const },
    { href: "/players", label: CRM_DASHBOARD_COPY.hubNavPlayers, mod: "players" as const },
  ].filter((l) => canView(l.mod));

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_DASHBOARD_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                С возвращением, {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_DASHBOARD_COPY.heroSubtitle}
              </p>
            </div>
            {hubLinks.length > 0 ? (
              <nav aria-label="CRM" className="flex flex-wrap gap-x-1 gap-y-2 text-sm">
                {hubLinks.map((l, i) => (
                  <span key={l.href} className="inline-flex items-center">
                    {i > 0 ? <span className="mx-2 text-slate-600" aria-hidden>·</span> : null}
                    <Link
                      href={l.href}
                      className="inline-flex items-center gap-1 font-medium text-slate-400 transition-colors hover:text-neon-blue"
                    >
                      {l.label}
                      <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
                    </Link>
                  </span>
                ))}
              </nav>
            ) : null}
          </div>
          <div className="flex shrink-0 items-stretch overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            <div className="w-1 shrink-0 bg-gradient-to-b from-neon-blue/80 to-neon-cyan/50" aria-hidden />
            <div className="px-5 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_DASHBOARD_COPY.roleChipLabel}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date().toLocaleDateString("ru-RU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_DASHBOARD_COPY.statsKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_DASHBOARD_COPY.statsTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_DASHBOARD_COPY.statsHint}</p>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              <DashboardStatCard
                label={CRM_DASHBOARD_COPY.statPlayers}
                icon={UserCircle}
                href="/players"
                canNavigate={canView("players")}
              >
                {s.playersCount}
              </DashboardStatCard>
              <DashboardStatCard
                label={CRM_DASHBOARD_COPY.statTeams}
                icon={Users}
                href="/teams"
                canNavigate={canView("teams")}
              >
                {s.teamsCount}
              </DashboardStatCard>
              <DashboardStatCard
                label={CRM_DASHBOARD_COPY.statCoaches}
                icon={GraduationCap}
                href="/coaches"
                canNavigate={canView("coaches")}
              >
                {s.coachesCount}
              </DashboardStatCard>
              <DashboardStatCard
                label={CRM_DASHBOARD_COPY.statTrainingsMonth}
                icon={Calendar}
                href="/trainings"
                canNavigate={canView("schedule")}
              >
                <>
                  {s.trainingsThisMonth}
                  <span className="text-lg font-normal text-slate-500 sm:text-xl">
                    {CRM_DASHBOARD_COPY.statTrainingsMonthSuffix}
                  </span>
                </>
              </DashboardStatCard>
              <DashboardStatCard label={CRM_DASHBOARD_COPY.statAttendance} icon={TrendingUp} href="/schedule" canNavigate={canView("schedule")}>
                {s.avgAttendance}%
              </DashboardStatCard>
              <DashboardStatCard
                label={CRM_DASHBOARD_COPY.statPaid}
                icon={Wallet}
                href="/finance"
                canNavigate={canView("finance")}
              >
                <span className="text-xl sm:text-2xl">
                  {s.paidAmount?.toLocaleString("ru")}
                  <span className="text-base font-normal text-slate-500 sm:text-lg">{CRM_DASHBOARD_COPY.currencySuffix}</span>
                </span>
              </DashboardStatCard>
              <DashboardStatCard
                label={CRM_DASHBOARD_COPY.statDebt}
                icon={AlertCircle}
                href="/finance"
                canNavigate={canView("finance")}
              >
                <span className="text-xl text-amber-200 sm:text-2xl">
                  {s.debtAmount?.toLocaleString("ru")}
                  <span className="text-base font-normal text-slate-500 sm:text-lg">{CRM_DASHBOARD_COPY.currencySuffix}</span>
                </span>
              </DashboardStatCard>
              <DashboardStatCard
                label={CRM_DASHBOARD_COPY.statRecs}
                icon={Star}
                href="/analytics"
                canNavigate={canView("analytics")}
              >
                {s.recommendationsCount}
              </DashboardStatCard>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <PanelHeader
              kicker={CRM_DASHBOARD_COPY.sectionTrainingsKicker}
              title={CRM_DASHBOARD_COPY.sectionTrainingsTitle}
              hint={CRM_DASHBOARD_COPY.sectionTrainingsHint}
              action={{ href: "/schedule", label: CRM_DASHBOARD_COPY.sectionTrainingsLink }}
            />
            <div className="p-0">
              {trainings.length > 0 ? (
                <div className="divide-y divide-white/[0.08]">
                  {trainings.map((t) => {
                    const d = new Date(t.startTime);
                    const end = t.endTime ? new Date(t.endTime) : null;
                    return (
                      <Link
                        key={t.id}
                        href={`/trainings/${t.id}`}
                        className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:gap-4 sm:px-6 sm:py-4"
                      >
                        <div className="flex shrink-0 flex-col items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            {d.toLocaleDateString("ru-RU", { weekday: "short" })}
                          </span>
                          <span className="font-display text-lg font-bold text-white">{d.getDate()}</span>
                          <span className="text-[10px] text-slate-500">{d.toLocaleDateString("ru-RU", { month: "short" })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white transition-colors group-hover:text-neon-blue">{t.title}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
                              {d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                              {end
                                ? ` – ${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
                                : null}
                            </span>
                            <span className="text-slate-600" aria-hidden>
                              ·
                            </span>
                            <span className="truncate">{t.team?.name ?? "—"}</span>
                          </p>
                          {t.team?.coach ? (
                            <p className="mt-0.5 text-xs text-slate-600">
                              {t.team.coach.firstName} {t.team.coach.lastName}
                            </p>
                          ) : null}
                          {t.location ? (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              <span className="truncate">{t.location}</span>
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight
                          className="mt-1 h-5 w-5 shrink-0 text-slate-500 opacity-40 transition-opacity group-hover:text-neon-blue group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-14 text-center sm:px-6">
                  <Calendar className="mx-auto h-11 w-11 text-slate-600" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-slate-400">{CRM_DASHBOARD_COPY.sectionTrainingsEmpty}</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-600">
                    {CRM_DASHBOARD_COPY.sectionTrainingsEmptyHint}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <PanelHeader
              kicker={CRM_DASHBOARD_COPY.sectionActivityKicker}
              title={CRM_DASHBOARD_COPY.sectionActivityTitle}
              hint={CRM_DASHBOARD_COPY.sectionActivityHint}
              action={
                canView("analytics")
                  ? { href: "/analytics", label: CRM_DASHBOARD_COPY.sectionActivityLink }
                  : undefined
              }
            />
            <div className="max-h-80 overflow-y-auto p-4 sm:p-5">
              {activity.length > 0 ? (
                <div className="space-y-2">
                  {activity.slice(0, 10).map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] ?? Zap;
                    return (
                      <div
                        key={a.id}
                        className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 transition-colors hover:border-white/[0.1] hover:bg-white/[0.03]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-500">
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">{ACTIVITY_LABELS[a.type] ?? a.type}</p>
                          <p className="text-xs text-slate-500">{a.message}</p>
                          <p className="mt-0.5 text-xs text-slate-600">{formatRelativeTime(a.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Zap className="mx-auto h-11 w-11 text-slate-600" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-slate-400">{CRM_DASHBOARD_COPY.sectionActivityEmpty}</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-600">
                    {CRM_DASHBOARD_COPY.sectionActivityEmptyHint}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <PanelHeader
              kicker={CRM_DASHBOARD_COPY.sectionFinanceKicker}
              title={CRM_DASHBOARD_COPY.sectionFinanceTitle}
              hint={CRM_DASHBOARD_COPY.sectionFinanceHint}
            />
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">{CRM_DASHBOARD_COPY.sectionFinancePaid}</span>
                <span className="font-mono text-sm font-semibold text-slate-200">
                  {s.paidAmount?.toLocaleString("ru")}
                  {CRM_DASHBOARD_COPY.currencySuffix}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">{CRM_DASHBOARD_COPY.sectionFinanceDebt}</span>
                <span className="font-mono text-sm font-semibold text-amber-200/90">
                  {s.debtAmount?.toLocaleString("ru")}
                  {CRM_DASHBOARD_COPY.currencySuffix}
                </span>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{CRM_DASHBOARD_COPY.sectionFinanceShare}</span>
                  <span>{paymentPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/60 transition-all duration-500"
                    style={{ width: `${paymentPct}%` }}
                  />
                </div>
              </div>
              {canView("finance") ? (
                <Link
                  href="/finance"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-neon-blue"
                >
                  {CRM_DASHBOARD_COPY.sectionFinanceCta}
                  <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
                </Link>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <PanelHeader
              kicker={CRM_DASHBOARD_COPY.sectionRecsKicker}
              title={CRM_DASHBOARD_COPY.sectionRecsTitle}
              hint={CRM_DASHBOARD_COPY.sectionRecsHint}
            />
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.1] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-500">
                    <Star className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-white">{s.recommendationsCount}</p>
                    <p className="text-sm text-slate-500">{CRM_DASHBOARD_COPY.sectionRecsSubtitle}</p>
                  </div>
                </div>
                {canView("analytics") ? (
                  <Link
                    href="/analytics"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-neon-blue"
                  >
                    {CRM_DASHBOARD_COPY.sectionRecsCta}
                    <ChevronRight className="h-4 w-4 opacity-50" aria-hidden />
                  </Link>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_DASHBOARD_COPY.quickActionsKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_DASHBOARD_COPY.quickActionsTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_DASHBOARD_COPY.quickActionsHint}</p>
          </div>
          <div className="p-4 sm:p-5">
            {quickActions.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {quickActions.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-500 transition-colors group-hover:text-slate-300">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="truncate font-medium text-white">{label}</span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-slate-500 opacity-40 transition-opacity group-hover:text-neon-blue group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-slate-500">
                {CRM_DASHBOARD_COPY.quickActionsEmpty}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

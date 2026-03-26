"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  UserCircle,
  GraduationCap,
  Users,
  TrendingUp,
  Calendar,
  Wallet,
  Filter,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/Card";
import { CRM_ATTENDANCE_COPY } from "@/lib/crmAttendanceCopy";

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const CHART_COLORS = ["#00d4ff", "#ff00aa", "#00ff88", "#bf00ff", "#ffaa00"];
const TOOLTIP_STYLE = {
  backgroundColor: "#12121a",
  border: "1px solid rgba(0,212,255,0.3)",
  borderRadius: "12px",
};

type Tab = "players" | "attendance" | "finance" | "coaches";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("attendance");
  const [teamId, setTeamId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [players, setPlayers] = useState<Record<string, unknown>>({});
  const [attendance, setAttendance] = useState<Record<string, unknown>>({});
  const [finance, setFinance] = useState<Record<string, unknown>>({});
  const [coachesData, setCoachesData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(Array.isArray(d) ? d : d?.teams ?? []))
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", teamId);
    if (tab === "finance") params.set("year", String(year));

    const fetches: Promise<Response>[] = [];
    if (tab === "players") fetches.push(fetch(`/api/analytics/players?${params}`));
    if (tab === "attendance") fetches.push(fetch(`/api/analytics/attendance?${params}`));
    if (tab === "finance") fetches.push(fetch(`/api/analytics/finance?${params}`));
    if (tab === "coaches") fetches.push(fetch(`/api/analytics/coaches?${params}`));

    Promise.all(fetches)
      .then((ress) =>
        Promise.all(
          ress.map(async (r) => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error("fetch failed");
            return data;
          })
        )
      )
      .then(([data]) => {
        if (tab === "players") setPlayers(data ?? {});
        if (tab === "attendance") setAttendance(data ?? {});
        if (tab === "finance") setFinance(data ?? {});
        if (tab === "coaches") setCoachesData(Array.isArray(data) ? data : []);
        setFetchError(false);
      })
      .catch(() => {
        setFetchError(true);
        if (tab === "players") setPlayers({});
        if (tab === "attendance") setAttendance({});
        if (tab === "finance") setFinance({});
        if (tab === "coaches") setCoachesData([]);
      })
      .finally(() => setLoading(false));
  }, [tab, teamId, year, reloadTick]);

  const playersByTeam = (players.byTeam as { name: string; count: number }[]) ?? [];
  const playersByPosition = (players.byPosition as { name: string; count: number }[]) ?? [];
  const playersStats = (players.statsByPlayer as { playerName: string; teamName: string; goals: number; assists: number; points: number; games: number }[]) ?? [];
  const avgRatingByTeam = (players.avgRatingByTeam as { name: string; avg: number }[]) ?? [];

  const attendanceByTeam = (attendance.byTeam as { name: string; rate: number; present: number; total: number }[]) ?? [];
  const attendanceByMonth = (attendance.byMonth as { month: number; rate: number }[]) ?? [];
  const topByAttendance = (attendance.topByAttendance as { playerName: string; teamName: string; rate: number }[]) ?? [];
  const topAbsences = (attendance.topAbsences as { playerName: string; teamName: string; absent: number }[]) ?? [];

  const financeByMonth = (finance.byMonth as { month: number; paidAmount: number; debtAmount: number; paidPercent: number }[]) ?? [];
  const financeByTeam = (finance.byTeam as { name: string; paidAmount: number; debtAmount: number }[]) ?? [];
  const topDebtors = (finance.topDebtors as { playerId?: string; playerName: string; teamName: string; totalDebt: number }[]) ?? [];
  const paidPercent = (finance.paidPercent as number) ?? 0;
  const avgAttendanceRate =
    attendanceByTeam.length > 0
      ? Math.round(attendanceByTeam.reduce((sum, item) => sum + item.rate, 0) / attendanceByTeam.length)
      : 0;
  const bestTeam = attendanceByTeam.length > 0 ? [...attendanceByTeam].sort((a, b) => b.rate - a.rate)[0] : null;
  const totalAbsences = topAbsences.reduce((sum, item) => sum + item.absent, 0);
  const topAttendancePlayer =
    topByAttendance.length > 0 ? [...topByAttendance].sort((a, b) => b.rate - a.rate)[0] : null;

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_ATTENDANCE_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_ATTENDANCE_COPY.loadingHint}</p>
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
              <p className="font-medium text-amber-100">{CRM_ATTENDANCE_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_ATTENDANCE_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_ATTENDANCE_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
              {CRM_ATTENDANCE_COPY.navDashboard}
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_ATTENDANCE_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_ATTENDANCE_COPY.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_ATTENDANCE_COPY.heroSubtitle}
              </p>
            </div>
          </div>
        </div>

      <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
        <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {CRM_ATTENDANCE_COPY.filtersKicker}
          </p>
          <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
            {CRM_ATTENDANCE_COPY.filtersTitle}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ATTENDANCE_COPY.filtersHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
          <Filter className="h-5 w-5 text-slate-500" />
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none"
          >
            <option value="">{CRM_ATTENDANCE_COPY.allTeams}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {tab === "finance" && (
            <>
              <span className="text-xs uppercase tracking-wider text-slate-600">{CRM_ATTENDANCE_COPY.yearsTitle}</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white focus:border-white/20 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
        <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {CRM_ATTENDANCE_COPY.tabsKicker}
          </p>
          <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
            {CRM_ATTENDANCE_COPY.tabsTitle}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 p-3 sm:p-4">
        {[
          { id: "players" as Tab, label: CRM_ATTENDANCE_COPY.tabPlayers, icon: UserCircle },
          { id: "attendance" as Tab, label: CRM_ATTENDANCE_COPY.tabAttendance, icon: Calendar },
          { id: "finance" as Tab, label: CRM_ATTENDANCE_COPY.tabFinance, icon: Wallet },
          { id: "coaches" as Tab, label: CRM_ATTENDANCE_COPY.tabCoaches, icon: GraduationCap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? "border-white/[0.15] bg-white/[0.08] text-white"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.12] hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        </div>
      </Card>

          {/* Игроки */}
          {tab === "players" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Распределение по командам
                  </h3>
                  <div className="h-64">
                    {playersByTeam.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={playersByTeam}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Распределение по позициям
                  </h3>
                  <div className="h-64">
                    {playersByPosition.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={playersByPosition}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, value }) => `${name} (${value})`}
                          >
                            {playersByPosition.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Средний рейтинг по командам
                  </h3>
                  <div className="h-64">
                    {avgRatingByTeam.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={avgRatingByTeam} layout="vertical" margin={{ left: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" fontSize={12} />
                          <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={120} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="avg" fill="#00ff88" radius={[0, 4, 4, 0]} name="Рейтинг" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Топ по очкам
                  </h3>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {playersStats
                      .filter((p) => p.points > 0)
                      .sort((a, b) => b.points - a.points)
                      .slice(0, 10)
                      .map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
                        >
                          <span className="text-sm text-white">{p.playerName}</span>
                          <span className="text-sm text-neon-blue">{p.points} очков</span>
                        </div>
                      ))}
                    {playersStats.filter((p) => p.points > 0).length === 0 && (
                      <p className="py-8 text-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Посещаемость */}
          {tab === "attendance" && (
            <div className="space-y-6">
              <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {CRM_ATTENDANCE_COPY.summaryKicker}
                  </p>
                  <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                    {CRM_ATTENDANCE_COPY.summaryTitle}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ATTENDANCE_COPY.summaryHint}</p>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-sm text-slate-500">{CRM_ATTENDANCE_COPY.statAvgRate}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{avgAttendanceRate}%</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-sm text-slate-500">{CRM_ATTENDANCE_COPY.statBestTeam}</p>
                    <p className="mt-1 truncate text-lg font-semibold text-white">{bestTeam?.name ?? "—"}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-sm text-slate-500">{CRM_ATTENDANCE_COPY.statAbsences}</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-200">{totalAbsences}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <p className="text-sm text-slate-500">{CRM_ATTENDANCE_COPY.statTopPlayer}</p>
                    <p className="mt-1 truncate text-lg font-semibold text-white">{topAttendancePlayer?.playerName ?? "—"}</p>
                  </div>
                </div>
              </Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                  <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_ATTENDANCE_COPY.sectionTeamsKicker}</p>
                    <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{CRM_ATTENDANCE_COPY.sectionTeamsTitle}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ATTENDANCE_COPY.sectionTeamsHint}</p>
                  </div>
                  <div className="h-72 p-4 sm:p-5">
                    {attendanceByTeam.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={attendanceByTeam}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [`${typeof v === "number" ? v : Number(v ?? 0)}%`, "Посещаемость"]} />
                          <Bar dataKey="rate" fill="#00d4ff" radius={[4, 4, 0, 0]} name="%" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">{CRM_ATTENDANCE_COPY.emptyTitle}</p>
                    )}
                  </div>
                </Card>
                <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                  <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_ATTENDANCE_COPY.sectionMonthKicker}</p>
                    <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{CRM_ATTENDANCE_COPY.sectionMonthTitle}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ATTENDANCE_COPY.sectionMonthHint}</p>
                  </div>
                  <div className="h-72 p-4 sm:p-5">
                    {attendanceByMonth.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={attendanceByMonth.map((m) => ({ ...m, name: MONTH_NAMES[m.month - 1] }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" domain={[0, 100]} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => [`${typeof v === "number" ? v : Number(v ?? 0)}%`, "Посещаемость"]} />
                          <Line type="monotone" dataKey="rate" stroke="#00ff88" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">{CRM_ATTENDANCE_COPY.emptyTitle}</p>
                    )}
                  </div>
                </Card>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                  <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_ATTENDANCE_COPY.sectionTopKicker}</p>
                    <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{CRM_ATTENDANCE_COPY.sectionTopTitle}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ATTENDANCE_COPY.sectionTopHint}</p>
                  </div>
                  <div className="space-y-2 p-4 sm:p-5">
                    {topByAttendance.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2">
                        <span className="text-sm text-white">{p.playerName}</span>
                        <span className="text-sm font-medium text-slate-300">{p.rate}%</span>
                      </div>
                    ))}
                    {topByAttendance.length === 0 && <p className="py-8 text-center text-slate-500">{CRM_ATTENDANCE_COPY.emptyTitle}</p>}
                  </div>
                </Card>
                <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                  <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_ATTENDANCE_COPY.sectionAbsencesKicker}</p>
                    <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">{CRM_ATTENDANCE_COPY.sectionAbsencesTitle}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ATTENDANCE_COPY.sectionAbsencesHint}</p>
                  </div>
                  <div className="space-y-2 p-4 sm:p-5">
                    {topAbsences.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2">
                        <span className="text-sm text-white">{p.playerName}</span>
                        <span className="text-sm text-amber-200">{p.absent}</span>
                      </div>
                    ))}
                    {topAbsences.length === 0 && <p className="py-8 text-center text-slate-500">{CRM_ATTENDANCE_COPY.emptyTitle}</p>}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Финансы */}
          {tab === "finance" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Оплаты по месяцам
                  </h3>
                  <div className="h-72">
                    {financeByMonth.some((m) => m.paidAmount > 0 || m.debtAmount > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financeByMonth.map((m) => ({ ...m, name: MONTH_NAMES[m.month - 1] }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v} ₽`} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Legend />
                          <Bar dataKey="paidAmount" fill="#00ff88" radius={[4, 4, 0, 0]} name="Оплачено" />
                          <Bar dataKey="debtAmount" fill="#ff00aa" radius={[4, 4, 0, 0]} name="Долг" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Задолженность по командам
                  </h3>
                  <div className="h-72">
                    {financeByTeam.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financeByTeam}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v} ₽`} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="debtAmount" fill="#ff00aa" radius={[4, 4, 0, 0]} name="Долг" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    % оплаченных счетов
                  </h3>
                  <div className="flex items-center justify-center py-12">
                    <span className="text-5xl font-bold text-neon-green">{paidPercent}%</span>
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Топ должников
                  </h3>
                  <div className="space-y-2">
                    {topDebtors.slice(0, 10).map((p, i) => (
                      <Link key={i} href={`/players/${p.playerId ?? "#"}`} className="block">
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition-colors hover:border-neon-pink/30">
                          <span className="text-sm text-white">{p.playerName}</span>
                          <span className="text-sm font-medium text-neon-pink">{p.totalDebt?.toLocaleString("ru")} ₽</span>
                        </div>
                      </Link>
                    ))}
                    {topDebtors.length === 0 && <p className="py-8 text-center text-slate-500">Нет данных</p>}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Тренеры */}
          {tab === "coaches" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Тренировки по тренерам
                  </h3>
                  <div className="h-72">
                    {coachesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={coachesData as { name: string; trainingsCount: number }[]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="trainingsCount" fill="#00d4ff" radius={[4, 4, 0, 0]} name="Тренировок" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Средний рейтинг по тренерам
                  </h3>
                  <div className="h-72">
                    {coachesData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={coachesData as { name: string; avgRating: number }[]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" domain={[0, 5]} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="avgRating" fill="#00ff88" radius={[4, 4, 0, 0]} name="Рейтинг" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
              </div>
              <Card>
                <h3 className="mb-4 font-display text-lg font-semibold text-white">
                  Сравнение тренеров
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-slate-400">
                        <th className="px-4 py-3">Тренер</th>
                        <th className="px-4 py-3">Тренировок</th>
                        <th className="px-4 py-3">Средний рейтинг</th>
                        <th className="px-4 py-3">Рекомендаций</th>
                        <th className="px-4 py-3">Игроков</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(coachesData as { name: string; trainingsCount: number; avgRating: number; recommendationsCount: number; playersCount: number }[]).map((c, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                          <td className="px-4 py-3 text-slate-300">{c.trainingsCount}</td>
                          <td className="px-4 py-3 text-neon-green">{c.avgRating}</td>
                          <td className="px-4 py-3 text-neon-pink">{c.recommendationsCount}</td>
                          <td className="px-4 py-3 text-slate-400">{c.playersCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {coachesData.length === 0 && <p className="py-12 text-center text-slate-500">Нет данных</p>}
              </Card>
            </div>
          )}
      </div>
    </div>
  );
}

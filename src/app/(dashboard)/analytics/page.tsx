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
} from "lucide-react";
import { Card } from "@/components/Card";

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const CHART_COLORS = ["#00d4ff", "#ff00aa", "#00ff88", "#bf00ff", "#ffaa00"];
const TOOLTIP_STYLE = {
  backgroundColor: "#12121a",
  border: "1px solid rgba(0,212,255,0.3)",
  borderRadius: "12px",
};

type Tab = "players" | "attendance" | "finance" | "coaches";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("players");
  const [teamId, setTeamId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [players, setPlayers] = useState<Record<string, unknown>>({});
  const [attendance, setAttendance] = useState<Record<string, unknown>>({});
  const [finance, setFinance] = useState<Record<string, unknown>>({});
  const [coachesData, setCoachesData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(Array.isArray(d) ? d : d?.teams ?? []))
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", teamId);
    if (tab === "finance") params.set("year", String(year));

    const fetches: Promise<Response>[] = [];
    if (tab === "players") fetches.push(fetch(`/api/analytics/players?${params}`));
    if (tab === "attendance") fetches.push(fetch(`/api/analytics/attendance?${params}`));
    if (tab === "finance") fetches.push(fetch(`/api/analytics/finance?${params}`));
    if (tab === "coaches") fetches.push(fetch(`/api/analytics/coaches?${params}`));

    Promise.all(fetches)
      .then((ress) => Promise.all(ress.map((r) => r.json())))
      .then(([data]) => {
        if (tab === "players") setPlayers(data ?? {});
        if (tab === "attendance") setAttendance(data ?? {});
        if (tab === "finance") setFinance(data ?? {});
        if (tab === "coaches") setCoachesData(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, teamId, year]);

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

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
          Аналитика
        </h1>
        <p className="mt-1 text-slate-400">
          Игроки, посещаемость, финансы, тренеры
        </p>
      </div>

      {/* Фильтры */}
      <Card className="mb-6 border-neon-blue/20 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-neon-blue" />
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white"
          >
            <option value="">Все команды</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {tab === "finance" && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* Вкладки */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: "players" as Tab, label: "Игроки", icon: UserCircle },
          { id: "attendance" as Tab, label: "Посещаемость", icon: Calendar },
          { id: "finance" as Tab, label: "Финансы", icon: Wallet },
          { id: "coaches" as Tab, label: "Тренеры", icon: GraduationCap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === id
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                : "border border-white/20 bg-white/5 text-slate-400 hover:border-neon-blue/30 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
        </div>
      ) : (
        <>
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
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Посещаемость по командам
                  </h3>
                  <div className="h-72">
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
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Посещаемость по месяцам
                  </h3>
                  <div className="h-72">
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
                      <p className="flex h-full items-center justify-center text-slate-500">Нет данных</p>
                    )}
                  </div>
                </Card>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Топ по посещаемости
                  </h3>
                  <div className="space-y-2">
                    {topByAttendance.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                        <span className="text-sm text-white">{p.playerName}</span>
                        <span className="text-sm font-medium text-neon-green">{p.rate}%</span>
                      </div>
                    ))}
                    {topByAttendance.length === 0 && <p className="py-8 text-center text-slate-500">Нет данных</p>}
                  </div>
                </Card>
                <Card>
                  <h3 className="mb-4 font-display text-lg font-semibold text-white">
                    Больше всего пропусков
                  </h3>
                  <div className="space-y-2">
                    {topAbsences.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                        <span className="text-sm text-white">{p.playerName}</span>
                        <span className="text-sm text-neon-pink">{p.absent}</span>
                      </div>
                    ))}
                    {topAbsences.length === 0 && <p className="py-8 text-center text-slate-500">Нет данных</p>}
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
        </>
      )}
    </div>
  );
}

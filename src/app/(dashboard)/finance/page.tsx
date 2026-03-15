"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Trash2,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const STATUS_COLORS: Record<string, string> = {
  Оплачено: "bg-neon-green/20 text-neon-green border-neon-green/40",
  "Не оплачено": "bg-neon-pink/20 text-neon-pink border-neon-pink/40",
  Частично: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  Просрочено: "bg-red-500/20 text-red-400 border-red-500/40",
};

interface Payment {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidAt: string | null;
  comment?: string | null;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    team?: { name: string } | null;
  };
}

export default function FinancePage() {
  const [summary, setSummary] = useState<{
    currentMonth: { totalAmount: number; paidCount: number; unpaidCount: number; debtAmount: number };
    byTeam: Record<string, { paid: number; unpaid: number; paidAmount: number; debtAmount: number }>;
    monthlyData: { month: number; paid: number; unpaid: number; paidAmount: number }[];
    lastPayments?: { id: string; month: number; year: number; amount: number; paidAt: string | null; player: { id: string; firstName: string; lastName: string; team?: { name: string } | null } }[];
    upcomingUnpaid?: { id: string; month: number; year: number; amount: number; player: { id: string; firstName: string; lastName: string; team?: { name: string } | null } }[];
  } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [debtors, setDebtors] = useState<
    { playerId: string; playerName: string; team: string; monthsUnpaid: number; totalDebt: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    teamId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: 5000,
  });

  const fetchData = () => {
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (teamId) params.set("teamId", teamId);
    if (status) params.set("status", status);
    if (month) params.set("month", month);
    if (search) params.set("search", search);

    Promise.all([
      fetch(`/api/finance/summary?year=${year}&month=${new Date().getMonth() + 1}`).then((r) => r.json()),
      fetch(`/api/payments?${params}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
      fetch(`/api/finance/debtors${teamId ? `?teamId=${teamId}` : ""}`).then((r) => r.json()),
    ])
      .then(([sum, payData, teamsData, debtData]) => {
        setSummary(sum);
        setPayments(Array.isArray(payData?.payments) ? payData.payments : payData?.payments ?? []);
        setTeams(Array.isArray(teamsData) ? teamsData : teamsData?.teams ?? []);
        setDebtors(Array.isArray(debtData) ? debtData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [teamId, status, month, year]);

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/payments/bulk-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bulkForm),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setShowBulk(false);
      setBulkForm({ teamId: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: 5000 });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить платёж?")) return;
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
      </div>
    );
  }

  const cm = summary?.currentMonth ?? { totalAmount: 0, paidCount: 0, unpaidCount: 0, debtAmount: 0 };
  const teamData = summary?.byTeam
    ? Object.entries(summary.byTeam).map(([name, d]) => {
        const totalAmount = d.paidAmount + d.debtAmount;
        const pct = totalAmount > 0 ? Math.round((d.paidAmount / totalAmount) * 100) : 0;
        return {
          name: name.length > 25 ? name.slice(0, 22) + "…" : name,
          paid: d.paidAmount,
          debt: d.debtAmount,
          total: d.paid + d.unpaid,
          pct,
        };
      })
    : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Финансы и оплаты
          </h1>
          <p className="mt-1 text-sm text-slate-400">Контроль оплат родителей за тренировки</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowBulk(!showBulk)} variant="secondary" className="shrink-0 gap-2">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Массовое начисление</span>
          </Button>
          <Link href="/finance/new" className="shrink-0">
            <Button className="w-full gap-2 sm:w-auto">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Новый платёж</span>
            </Button>
          </Link>
        </div>
      </div>

      {showBulk && (
        <Card className="mb-6 border-neon-blue/30">
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Массовое начисление</h3>
          <form onSubmit={handleBulkCreate} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Команда *</label>
              <select
                value={bulkForm.teamId}
                onChange={(e) => setBulkForm({ ...bulkForm, teamId: e.target.value })}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                required
              >
                <option value="">Выберите команду</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Месяц *</label>
              <select
                value={bulkForm.month}
                onChange={(e) => setBulkForm({ ...bulkForm, month: Number(e.target.value) })}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Год *</label>
              <input
                type="number"
                min={2020}
                max={2030}
                value={bulkForm.year}
                onChange={(e) => setBulkForm({ ...bulkForm, year: Number(e.target.value) })}
                className="w-24 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Сумма (₽) *</label>
              <input
                type="number"
                min={0}
                value={bulkForm.amount}
                onChange={(e) => setBulkForm({ ...bulkForm, amount: Number(e.target.value) })}
                className="w-28 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
              />
            </div>
            <Button type="submit">Создать для всех игроков</Button>
          </form>
        </Card>
      )}

      {/* KPI */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-neon-green/20">
          <p className="text-sm text-slate-400">Собрано за месяц</p>
          <p className="mt-1 text-2xl font-bold text-neon-green">{cm.totalAmount?.toLocaleString("ru") ?? 0} ₽</p>
          <p className="text-xs text-slate-500">{cm.paidCount} оплаченных</p>
        </Card>
        <Card className="border-neon-pink/20">
          <p className="text-sm text-slate-400">Не оплачено</p>
          <p className="mt-1 text-2xl font-bold text-neon-pink">{cm.unpaidCount}</p>
          <p className="text-xs text-slate-500">счетов</p>
        </Card>
        <Card className="border-amber-500/20">
          <p className="text-sm text-slate-400">Задолженность</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{cm.debtAmount?.toLocaleString("ru") ?? 0} ₽</p>
        </Card>
        <Card className="border-neon-blue/20">
          <p className="text-sm text-slate-400">Оплачено счетов</p>
          <p className="mt-1 text-2xl font-bold text-neon-blue">{cm.paidCount}</p>
        </Card>
      </div>

      {/* Фильтры */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-5 w-5 text-neon-blue" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Игрок..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            className="w-48 rounded-xl border border-white/20 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500"
          />
        </div>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
        >
          <option value="">Все команды</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
        >
          <option value="">Все статусы</option>
          <option value="Оплачено">Оплачено</option>
          <option value="Не оплачено">Не оплачено</option>
          <option value="Частично">Частично</option>
          <option value="Просрочено">Просрочено</option>
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
        >
          <option value="">Все месяцы</option>
          {MONTH_NAMES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          min={2020}
          max={2030}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
        />
        <Button size="sm" variant="secondary" onClick={() => fetchData()}>
          Применить
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* График оплат по месяцам */}
          {summary?.monthlyData && summary.monthlyData.length > 0 && (
            <Card className="border-neon-blue/20">
              <h3 className="mb-4 font-display text-lg font-semibold text-white">Оплаты по месяцам</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.monthlyData.map((d) => ({ ...d, name: MONTH_NAMES[d.month - 1] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v} ₽`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(0,212,255,0.3)", borderRadius: "12px" }}
                      formatter={(v: unknown) => [`${Number(v ?? 0).toLocaleString("ru")} ₽`, "Оплачено"]}
                    />
                    <Bar dataKey="paidAmount" fill="#00d4ff" radius={[4, 4, 0, 0]} name="Оплачено" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Таблица оплат */}
          <Card className="border-neon-blue/20 overflow-hidden">
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Таблица оплат</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left text-slate-400">
                    <th className="px-4 py-3">Игрок</th>
                    <th className="px-4 py-3">Команда</th>
                    <th className="px-4 py-3">Месяц</th>
                    <th className="px-4 py-3">Сумма</th>
                    <th className="px-4 py-3">Статус</th>
                    <th className="px-4 py-3">Дата оплаты</th>
                    <th className="px-4 py-3">Комментарий</th>
                    <th className="px-4 py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <Link href={`/players/${p.player.id}`} className="font-medium text-white hover:text-neon-blue">
                          {p.player.firstName} {p.player.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p.player.team?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-white">{p.amount.toLocaleString("ru")} ₽</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? "bg-white/10 text-slate-400"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ru-RU") : "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-slate-500" title={p.comment ?? ""}>
                        {p.comment ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex shrink-0 gap-2">
                          <Link href={`/finance/${p.id}`}>
                            <Button variant="ghost" size="sm" className="whitespace-nowrap">Открыть</Button>
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            className="rounded p-1 text-neon-pink hover:bg-neon-pink/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && (
              <div className="py-12 text-center text-slate-500">Нет платежей</div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Последние платежи */}
          {summary?.lastPayments && summary.lastPayments.length > 0 && (
            <Card className="border-neon-green/20">
              <h3 className="mb-4 font-display text-lg font-semibold text-white">Последние платежи</h3>
              <div className="space-y-2">
                {summary.lastPayments.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    href={`/finance/${p.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-neon-blue/30"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{p.player.firstName} {p.player.lastName}</p>
                      <p className="text-xs text-slate-500">{MONTH_NAMES[p.month - 1]} {p.year} • {p.amount.toLocaleString("ru")} ₽</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Ближайшие неоплаченные */}
          {summary?.upcomingUnpaid && summary.upcomingUnpaid.length > 0 && (
            <Card className="border-amber-500/20">
              <h3 className="mb-4 font-display text-lg font-semibold text-white">Ближайшие неоплаченные</h3>
              <div className="space-y-2">
                {summary.upcomingUnpaid.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    href={`/finance/${p.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:border-neon-blue/30"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{p.player.firstName} {p.player.lastName}</p>
                      <p className="text-xs text-slate-500">{MONTH_NAMES[p.month - 1]} {p.year} • {p.amount.toLocaleString("ru")} ₽</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* По командам + процент */}
          {teamData.length > 0 && (
            <Card className="border-neon-pink/20">
              <h3 className="mb-4 font-display text-lg font-semibold text-white">По командам</h3>
              <div className="space-y-3">
                {teamData.map((t) => (
                  <div key={t.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="font-medium text-white">{t.name}</p>
                    <p className="text-sm text-neon-green">Оплачено: {t.paid.toLocaleString("ru")} ₽</p>
                    <p className="text-sm text-neon-pink">Долг: {t.debt.toLocaleString("ru")} ₽</p>
                    <p className="mt-1 text-xs text-slate-500">Оплат: {t.pct}%</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* График команд */}
          {teamData.length > 0 && (
            <Card className="border-neon-blue/20">
              <h3 className="mb-4 font-display text-lg font-semibold text-white">Сравнение команд</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v} ₽`} />
                    <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(0,212,255,0.3)", borderRadius: "12px" }} />
                    <Bar dataKey="paid" fill="#00ff88" radius={[0, 4, 4, 0]} name="Оплачено" />
                    <Bar dataKey="debt" fill="#ff00aa" radius={[0, 4, 4, 0]} name="Долг" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Должники */}
          <Card className="border-amber-500/20">
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Топ должников</h3>
            {debtors.length > 0 ? (
              <div className="space-y-2">
                {debtors.slice(0, 8).map((d) => (
                  <Link
                    key={d.playerId}
                    href={`/players/${d.playerId}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-neon-blue/30"
                  >
                    <div>
                      <p className="font-medium text-white">{d.playerName}</p>
                      <p className="text-xs text-slate-500">{d.team} • {d.monthsUnpaid} мес.</p>
                    </div>
                    <p className="font-bold text-amber-400">{d.totalDebt.toLocaleString("ru")} ₽</p>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Должников нет</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

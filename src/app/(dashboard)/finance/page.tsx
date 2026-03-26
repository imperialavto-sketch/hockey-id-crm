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
  Wallet,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CRM_FINANCE_COPY } from "@/lib/crmFinanceCopy";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const STATUS_COLORS: Record<string, string> = {
  Оплачено: "border-neon-green/35 bg-neon-green/15 text-neon-green",
  "Не оплачено": "border-rose-500/30 bg-rose-500/15 text-rose-200",
  Частично: "border-amber-500/35 bg-amber-500/15 text-amber-200",
  Просрочено: "border-red-500/35 bg-red-500/15 text-red-200",
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
  const [fetchError, setFetchError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
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
    setLoading(true);
    setFetchError(false);
    const params = new URLSearchParams();
    params.set("year", String(year));
    if (teamId) params.set("teamId", teamId);
    if (status) params.set("status", status);
    if (month) params.set("month", month);
    if (search) params.set("search", search);

    Promise.all([
      fetch(`/api/finance/summary?year=${year}&month=${new Date().getMonth() + 1}`).then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("summary failed");
        return data;
      }),
      fetch(`/api/payments?${params}`).then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("payments failed");
        return data;
      }),
      fetch("/api/teams").then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("teams failed");
        return data;
      }),
      fetch(`/api/finance/debtors${teamId ? `?teamId=${teamId}` : ""}`).then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("debtors failed");
        return data;
      }),
    ])
      .then(([sum, payData, teamsData, debtData]) => {
        setSummary(sum);
        setPayments(Array.isArray(payData?.payments) ? payData.payments : payData?.payments ?? []);
        setTeams(Array.isArray(teamsData) ? teamsData : teamsData?.teams ?? []);
        setDebtors(Array.isArray(debtData) ? debtData : []);
        setFetchError(false);
      })
      .catch(() => {
        setSummary(null);
        setPayments([]);
        setTeams([]);
        setDebtors([]);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [teamId, status, month, year, loadTick]);

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
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_FINANCE_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_FINANCE_COPY.loadingHint}</p>
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
              <p className="font-medium text-amber-100">{CRM_FINANCE_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_FINANCE_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setLoadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_FINANCE_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cm = summary?.currentMonth ?? { totalAmount: 0, paidCount: 0, unpaidCount: 0, debtAmount: 0 };
  const teamData = summary?.byTeam
    ? Object.entries(summary.byTeam).map(([name, d]) => {
        const totalAmount = d.paidAmount + d.debtAmount;
        const pct = totalAmount > 0 ? Math.round((d.paidAmount / totalAmount) * 100) : 0;
        return {
          name: name.length > 25 ? `${name.slice(0, 22)}…` : name,
          paid: d.paidAmount,
          debt: d.debtAmount,
          total: d.paid + d.unpaid,
          pct,
        };
      })
    : [];

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
              {CRM_FINANCE_COPY.navDashboard}
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_FINANCE_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_FINANCE_COPY.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_FINANCE_COPY.heroSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setShowBulk(!showBulk)} variant="secondary" className="shrink-0 gap-2">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{CRM_FINANCE_COPY.bulkCta}</span>
              </Button>
              <Link href="/finance/new" className="shrink-0">
                <Button className="w-full gap-2 sm:w-auto">
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{CRM_FINANCE_COPY.newPaymentCta}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {showBulk && (
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_FINANCE_COPY.filtersKicker}
              </p>
              <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {CRM_FINANCE_COPY.bulkTitle}
              </h2>
            </div>
            <div className="p-4 sm:p-5">
              <form onSubmit={handleBulkCreate} className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_COPY.bulkTeam} *</label>
                  <select
                    value={bulkForm.teamId}
                    onChange={(e) => setBulkForm({ ...bulkForm, teamId: e.target.value })}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                    required
                  >
                    <option value="">{CRM_FINANCE_COPY.filterTeamAll}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_COPY.bulkMonth} *</label>
                  <select
                    value={bulkForm.month}
                    onChange={(e) => setBulkForm({ ...bulkForm, month: Number(e.target.value) })}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_COPY.bulkYear} *</label>
                  <input
                    type="number"
                    min={2020}
                    max={2030}
                    value={bulkForm.year}
                    onChange={(e) => setBulkForm({ ...bulkForm, year: Number(e.target.value) })}
                    className="w-24 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_COPY.bulkAmount} *</label>
                  <input
                    type="number"
                    min={0}
                    value={bulkForm.amount}
                    onChange={(e) => setBulkForm({ ...bulkForm, amount: Number(e.target.value) })}
                    className="w-28 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                  />
                </div>
                <Button type="submit">{CRM_FINANCE_COPY.bulkSubmit}</Button>
              </form>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_FINANCE_COPY.filtersKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_FINANCE_COPY.filtersTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_FINANCE_COPY.filtersHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <Filter className="h-5 w-5 text-slate-500" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                placeholder={CRM_FINANCE_COPY.filterSearch}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                className="w-48 rounded-xl border border-white/[0.08] bg-white/[0.05] py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-white/20 focus:outline-none"
              />
            </div>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">{CRM_FINANCE_COPY.filterTeamAll}</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">{CRM_FINANCE_COPY.filterStatusAll}</option>
              <option value="Оплачено">{CRM_FINANCE_COPY.statusPaid}</option>
              <option value="Не оплачено">{CRM_FINANCE_COPY.statusUnpaid}</option>
              <option value="Частично">{CRM_FINANCE_COPY.statusPartial}</option>
              <option value="Просрочено">{CRM_FINANCE_COPY.statusOverdue}</option>
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">{CRM_FINANCE_COPY.filterMonthAll}</option>
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
              className="w-24 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
            />
            <Button size="sm" variant="secondary" onClick={() => fetchData()}>
              {CRM_FINANCE_COPY.applyFilters}
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_FINANCE_COPY.sectionSummaryKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_FINANCE_COPY.sectionSummaryTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_FINANCE_COPY.sectionSummaryHint}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_FINANCE_COPY.kpiCollected}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{cm.totalAmount?.toLocaleString("ru") ?? 0} ₽</p>
              <p className="text-xs text-slate-600">{cm.paidCount} оплаченных</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_FINANCE_COPY.kpiUnpaid}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{cm.unpaidCount}</p>
              <p className="text-xs text-slate-600">счетов</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_FINANCE_COPY.kpiDebt}</p>
              <p className="mt-1 text-2xl font-semibold text-amber-200">{cm.debtAmount?.toLocaleString("ru") ?? 0} ₽</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_FINANCE_COPY.kpiPaidCount}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{cm.paidCount}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {summary?.monthlyData && summary.monthlyData.length > 0 && (
              <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {CRM_FINANCE_COPY.sectionChartKicker}
                  </p>
                  <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                    {CRM_FINANCE_COPY.sectionChartTitle}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_FINANCE_COPY.sectionChartHint}</p>
                </div>
                <div className="h-64 p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.monthlyData.map((d) => ({ ...d, name: MONTH_NAMES[d.month - 1] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v} ₽`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "12px" }}
                        formatter={(v: unknown) => [`${Number(v ?? 0).toLocaleString("ru")} ₽`, "Оплачено"]}
                      />
                      <Bar dataKey="paidAmount" fill="#00d4ff" radius={[4, 4, 0, 0]} name="Оплачено" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {CRM_FINANCE_COPY.sectionTableKicker}
                </p>
                <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                  {CRM_FINANCE_COPY.sectionTableTitle}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_FINANCE_COPY.sectionTableHint}</p>
              </div>
              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.02] text-left text-slate-400">
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colPlayer}</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colTeam}</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colMonth}</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colAmount}</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colStatus}</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colPaidAt}</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colComment}</th>
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">{CRM_FINANCE_COPY.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]">
                          <td className="px-4 py-3">
                            <Link href={`/players/${p.player.id}`} className="font-medium text-white transition-colors hover:text-neon-blue">
                              {p.player.firstName} {p.player.lastName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{p.player.team?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-300">{MONTH_NAMES[p.month - 1]} {p.year}</td>
                          <td className="px-4 py-3 text-white">{p.amount.toLocaleString("ru")} ₽</td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[p.status] ?? "border-white/[0.08] bg-white/10 text-slate-400")}>
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
                                <Button variant="ghost" size="sm" className="whitespace-nowrap">{CRM_FINANCE_COPY.openCta}</Button>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(p.id)}
                                className="rounded p-1 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
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
              ) : (
                <div className="px-4 py-14 text-center sm:px-6">
                  <Wallet className="mx-auto h-11 w-11 text-slate-600" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-slate-400">{CRM_FINANCE_COPY.emptyTitle}</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
                    {CRM_FINANCE_COPY.emptyHint}
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            {summary?.lastPayments && summary.lastPayments.length > 0 && (
              <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {CRM_FINANCE_COPY.sectionLastKicker}
                  </p>
                  <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                    {CRM_FINANCE_COPY.sectionLastTitle}
                  </h3>
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  {summary.lastPayments.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/finance/${p.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
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

            {summary?.upcomingUnpaid && summary.upcomingUnpaid.length > 0 && (
              <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {CRM_FINANCE_COPY.sectionUpcomingKicker}
                  </p>
                  <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                    {CRM_FINANCE_COPY.sectionUpcomingTitle}
                  </h3>
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  {summary.upcomingUnpaid.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/finance/${p.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
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

            {teamData.length > 0 && (
              <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {CRM_FINANCE_COPY.sectionTeamsKicker}
                  </p>
                  <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                    {CRM_FINANCE_COPY.sectionTeamsTitle}
                  </h3>
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  {teamData.map((t) => (
                    <div key={t.name} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="text-sm text-slate-400">Оплачено: {t.paid.toLocaleString("ru")} ₽</p>
                      <p className="text-sm text-slate-400">Долг: {t.debt.toLocaleString("ru")} ₽</p>
                      <p className="mt-1 text-xs text-slate-600">Оплат: {t.pct}%</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {teamData.length > 0 && (
              <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {CRM_FINANCE_COPY.sectionTeamsKicker}
                  </p>
                  <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                    {CRM_FINANCE_COPY.sectionTeamsChartTitle}
                  </h3>
                </div>
                <div className="h-48 p-4 sm:p-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v} ₽`} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={100} />
                      <Tooltip contentStyle={{ backgroundColor: "#12121a", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "12px" }} />
                      <Bar dataKey="paid" fill="#00ff88" radius={[0, 4, 4, 0]} name="Оплачено" />
                      <Bar dataKey="debt" fill="#ff8a9f" radius={[0, 4, 4, 0]} name="Долг" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {CRM_FINANCE_COPY.sectionDebtorsKicker}
                </p>
                <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                  {CRM_FINANCE_COPY.sectionDebtorsTitle}
                </h3>
              </div>
              <div className="p-4 sm:p-5">
                {debtors.length > 0 ? (
                  <div className="space-y-2">
                    {debtors.slice(0, 8).map((d) => (
                      <Link
                        key={d.playerId}
                        href={`/players/${d.playerId}`}
                        className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
                      >
                        <div>
                          <p className="font-medium text-white">{d.playerName}</p>
                          <p className="text-xs text-slate-500">{d.team} • {d.monthsUnpaid}{CRM_FINANCE_COPY.monthSuffix}</p>
                        </div>
                        <p className="font-semibold text-amber-200">{d.totalDebt.toLocaleString("ru")} ₽</p>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">{CRM_FINANCE_COPY.debtorsEmpty}</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

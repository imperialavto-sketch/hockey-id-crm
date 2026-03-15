"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  CreditCard,
  Filter,
  Plus,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface Payment {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  paidAt: string | null;
  stripeCheckoutUrl: string | null;
  player: {
    firstName: string;
    lastName: string;
    team?: { name: string } | null;
  };
}

export default function PaymentsPage() {
  const [data, setData] = useState<{
    payments: Payment[];
    teams: { id: string; name: string }[];
    summary: {
      total: number;
      paid: number;
      unpaid: number;
      totalAmount: number;
      paidAmount: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = () => {
    const params = new URLSearchParams();
    if (teamId) params.set("teamId", teamId);
    if (status) params.set("status", status);
    params.set("year", String(year));
    fetch(`/api/payments?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [teamId, status, year]);

  const handleGenerate = () => {
    setGenerating(true);
    fetch("/api/payments/generate", { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) fetchData();
      })
      .finally(() => setGenerating(false));
  };

  const monthNames = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  const summary = data?.summary ?? { total: 0, paid: 0, unpaid: 0, totalAmount: 0, paidAmount: 0 };
  const payments = data?.payments ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Платежи
          </h1>
          <p className="mt-1 text-slate-400">
            Контроль оплат школы • Статус виден для каждого игрока
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="gap-2"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Сгенерировать платежи за месяц
        </Button>
      </div>

      {/* Фильтры */}
      <Card className="mb-6 border-neon-blue/20 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-neon-blue" />
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white focus:border-neon-blue focus:outline-none"
          >
            <option value="">Все команды</option>
            {(data?.teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white focus:border-neon-blue focus:outline-none"
          >
            <option value="">Все статусы</option>
            <option value="Оплачено">Оплачено</option>
            <option value="Не оплачено">Не оплачено</option>
          </select>
          <input
            type="number"
            min={2020}
            max={2030}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white focus:border-neon-blue focus:outline-none"
          />
        </div>
      </Card>

      {/* Сводка */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-neon-blue/20">
          <p className="text-sm text-slate-400">Всего платежей</p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.total}</p>
        </Card>
        <Card className="border-neon-green/20">
          <p className="text-sm text-slate-400">Оплачено</p>
          <p className="mt-1 text-2xl font-bold text-neon-green">{summary.paid}</p>
        </Card>
        <Card className="border-neon-pink/20">
          <p className="text-sm text-slate-400">Не оплачено</p>
          <p className="mt-1 text-2xl font-bold text-neon-pink">{summary.unpaid}</p>
        </Card>
        <Card className="border-neon-cyan/20">
          <p className="text-sm text-slate-400">Сумма (оплачено)</p>
          <p className="mt-1 text-2xl font-bold text-neon-cyan">
            {summary.paidAmount?.toLocaleString("ru") ?? 0} ₽
          </p>
        </Card>
      </div>

      {/* Таблица */}
      <Card className="overflow-hidden border-neon-blue/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left">
                <th className="px-4 py-3 text-slate-400">Игрок</th>
                <th className="px-4 py-3 text-slate-400">Команда</th>
                <th className="px-4 py-3 text-slate-400">Месяц</th>
                <th className="px-4 py-3 text-slate-400">Сумма</th>
                <th className="px-4 py-3 text-slate-400">Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">
                    {p.player.firstName} {p.player.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.player.team?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {monthNames[p.month - 1]} {p.year}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{p.amount} ₽</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.status === "Оплачено"
                          ? "bg-neon-green/20 text-neon-green"
                          : "bg-neon-pink/20 text-neon-pink"
                      }`}
                    >
                      {p.status === "Оплачено" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            Нет платежей. Нажмите «Сгенерировать платежи за месяц».
          </div>
        )}
      </Card>
    </div>
  );
}

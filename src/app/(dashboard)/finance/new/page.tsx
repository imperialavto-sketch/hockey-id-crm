"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const STATUSES = ["Оплачено", "Не оплачено", "Частично", "Просрочено"];

export default function NewPaymentPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [players, setPlayers] = useState<{ id: string; firstName: string; lastName: string; teamId: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const [form, setForm] = useState({
    playerId: "",
    teamId: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    amount: 5000,
    status: "Не оплачено",
    paidAt: "",
    comment: "",
  });

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(Array.isArray(d) ? d : d?.teams ?? []))
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.players ?? d?.data ?? [];
        setPlayers(list);
      })
      .catch(() => setPlayers([]));
  }, []);

  const filteredPlayers = form.teamId
    ? players.filter((p) => p.teamId === form.teamId)
    : players;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.playerId) {
      setError("Выберите игрока");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: form.playerId,
          month: form.month,
          year: form.year,
          amount: form.amount,
          status: form.status,
          paidAt: form.paidAt || null,
          comment: form.comment.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка создания платежа");
        setLoading(false);
        return;
      }
      router.push(`/finance/${data.id}`);
    } catch {
      setError("Ошибка создания платежа");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/finance"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к финансам
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Новый платёж</h1>
        <p className="mt-1 text-sm text-slate-400">Создание платежа за тренировки</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        {error && (
          <div className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-neon-pink">{error}</div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Команда</label>
          <select
            value={form.teamId}
            onChange={(e) => setForm({ ...form, teamId: e.target.value, playerId: "" })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
          >
            <option value="">Все команды</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Игрок *</label>
          <select
            value={form.playerId}
            onChange={(e) => setForm({ ...form, playerId: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            required
          >
            <option value="">Выберите игрока</option>
            {filteredPlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Месяц *</label>
            <select
              value={form.month}
              onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Год *</label>
            <input
              type="number"
              min={2020}
              max={2030}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Сумма (₽) *</label>
          <input
            type="number"
            min={0}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Статус</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Дата оплаты</label>
          <input
            type="date"
            value={form.paidAt}
            onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Комментарий</label>
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={3}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            placeholder="Дополнительная информация"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Создание…" : "Создать платёж"}
          </Button>
          <Link href="/finance">
            <Button type="button" variant="secondary">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

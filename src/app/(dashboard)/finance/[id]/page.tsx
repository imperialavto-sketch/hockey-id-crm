"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const STATUSES = ["Оплачено", "Не оплачено", "Частично", "Просрочено"];
const STATUS_COLORS: Record<string, string> = {
  Оплачено: "bg-neon-green/20 text-neon-green border-neon-green/40",
  "Не оплачено": "bg-neon-pink/20 text-neon-pink border-neon-pink/40",
  Частично: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  Просрочено: "bg-red-500/20 text-red-400 border-red-500/40",
};

export default function PaymentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [payment, setPayment] = useState<{
    id: string;
    month: number;
    year: number;
    amount: number;
    status: string;
    paidAt: string | null;
    comment: string | null;
    createdAt: string;
    updatedAt: string;
    player: { id: string; firstName: string; lastName: string; team: { name: string } | null };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({ amount: 0, status: "", paidAt: "", comment: "" });

  const fetchPayment = () => {
    if (!id) return;
    fetch(`/api/payments/${id}`)
      .then((r) => r.json())
      .then((p) => {
        setPayment(p);
        setEdit({
          amount: p.amount ?? 0,
          status: p.status ?? "Не оплачено",
          paidAt: p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : "",
          comment: p.comment ?? "",
        });
      })
      .catch(() => setPayment(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const res = await fetch(`/api/payments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: edit.amount,
        status: edit.status,
        paidAt: edit.paidAt || null,
        comment: edit.comment.trim() || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayment(data);
      setEdit({
        amount: data.amount,
        status: data.status,
        paidAt: data.paidAt ? new Date(data.paidAt).toISOString().slice(0, 10) : "",
        comment: data.comment ?? "",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-6 sm:p-8">
        <Link href="/finance" className="mb-6 inline-flex items-center gap-2 text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <p className="text-neon-pink">Платёж не найден</p>
      </div>
    );
  }

  const playerName = `${payment.player.firstName} ${payment.player.lastName}`;

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
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Платёж</h1>
        <p className="mt-1 text-slate-400">{MONTH_NAMES[payment.month - 1]} {payment.year}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-neon-blue/20">
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Информация</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-slate-500">Игрок</dt>
              <dd>
                <Link href={`/players/${payment.player.id}`} className="font-medium text-neon-blue hover:underline">
                  {playerName}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Команда</dt>
              <dd className="text-white">{payment.player.team?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Месяц / Год</dt>
              <dd className="text-white">{MONTH_NAMES[payment.month - 1]} {payment.year}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Сумма</dt>
              <dd className="text-white">{payment.amount.toLocaleString("ru")} ₽</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Статус</dt>
              <dd>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[payment.status] ?? "bg-white/10"}`}>
                  {payment.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Дата оплаты</dt>
              <dd className="text-white">
                {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("ru-RU") : "—"}
              </dd>
            </div>
            {payment.comment && (
              <div>
                <dt className="text-sm text-slate-500">Комментарий</dt>
                <dd className="text-slate-300">{payment.comment}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="border-neon-blue/20">
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Редактирование</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Сумма (₽)</label>
              <input
                type="number"
                min={0}
                value={edit.amount}
                onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Статус</label>
              <select
                value={edit.status}
                onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Дата оплаты</label>
              <input
                type="date"
                value={edit.paidAt}
                onChange={(e) => setEdit({ ...edit, paidAt: e.target.value })}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Комментарий</label>
              <textarea
                value={edit.comment}
                onChange={(e) => setEdit({ ...edit, comment: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
                placeholder="Дополнительная информация"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6 border-white/10">
        <h3 className="mb-4 font-display text-lg font-semibold text-white">История изменений</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p>Создан: {new Date(payment.createdAt).toLocaleString("ru-RU")}</p>
          <p>Обновлён: {new Date(payment.updatedAt).toLocaleString("ru-RU")}</p>
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, ChevronRight, Wallet } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";
import { CRM_FINANCE_DETAIL_COPY } from "@/lib/crmFinanceDetailCopy";

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const STATUSES = [
  CRM_FINANCE_DETAIL_COPY.statusPaid,
  CRM_FINANCE_DETAIL_COPY.statusUnpaid,
  CRM_FINANCE_DETAIL_COPY.statusPartial,
  CRM_FINANCE_DETAIL_COPY.statusOverdue,
];
const STATUS_COLORS: Record<string, string> = {
  Оплачено: "border-neon-green/35 bg-neon-green/15 text-neon-green",
  "Не оплачено": "border-rose-500/30 bg-rose-500/15 text-rose-200",
  Частично: "border-amber-500/35 bg-amber-500/15 text-amber-200",
  Просрочено: "border-red-500/35 bg-red-500/15 text-red-200",
};

type PaymentRecord = {
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
};

export default function PaymentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({ amount: 0, status: "", paidAt: "", comment: "" });

  const fetchPayment = () => {
    if (!id) {
      setPayment(null);
      setLoading(false);
      setFetchError(false);
      return;
    }
    setLoading(true);
    setFetchError(false);
    fetch(`/api/payments/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error("fetch failed");
        return data;
      })
      .then((p) => {
        if (!p?.id) {
          setPayment(null);
          setFetchError(false);
          return;
        }
        setPayment(p);
        setEdit({
          amount: p.amount ?? 0,
          status: p.status ?? CRM_FINANCE_DETAIL_COPY.statusUnpaid,
          paidAt: p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : "",
          comment: p.comment ?? "",
        });
        setFetchError(false);
      })
      .catch(() => {
        setFetchError(true);
        setPayment(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayment();
  }, [id, reloadTick]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
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
      const data = await res.json().catch(() => null);
      if (res.ok && data?.id) {
        setPayment(data);
        setEdit({
          amount: data.amount,
          status: data.status,
          paidAt: data.paidAt ? new Date(data.paidAt).toISOString().slice(0, 10) : "",
          comment: data.comment ?? "",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_FINANCE_DETAIL_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.loadingHint}</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/finance"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_FINANCE_DETAIL_COPY.backFinance}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_FINANCE_DETAIL_COPY.backDashboard}
            </Link>
          </div>
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_FINANCE_DETAIL_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_FINANCE_DETAIL_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_FINANCE_DETAIL_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/finance"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_FINANCE_DETAIL_COPY.backFinance}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_FINANCE_DETAIL_COPY.backDashboard}
            </Link>
          </div>
          <div className="mx-auto max-w-2xl">
            <Card className="border-white/[0.08] p-8 text-center">
              <p className="font-display text-lg font-semibold text-white">{CRM_FINANCE_DETAIL_COPY.notFoundTitle}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.notFoundHint}</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/finance" className="inline-flex">
                  <Button variant="secondary" className="gap-2">
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    {CRM_FINANCE_DETAIL_COPY.notFoundBack}
                  </Button>
                </Link>
                <Link href="/dashboard" className="inline-flex">
                  <Button className="gap-2">
                    {CRM_FINANCE_DETAIL_COPY.notFoundDashboard}
                    <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const playerName = `${payment.player.firstName} ${payment.player.lastName}`;
  const periodLabel = `${MONTH_NAMES[payment.month - 1]} ${payment.year}`;

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/finance"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_FINANCE_DETAIL_COPY.backFinance}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_FINANCE_DETAIL_COPY.backDashboard}
            </Link>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-transparent p-0">
          <div className="relative flex flex-col gap-4 p-5 sm:p-6">
            <div className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-gradient-to-b from-neon-blue via-neon-cyan/80 to-neon-pink/60" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
              {CRM_FINANCE_DETAIL_COPY.heroEyebrow}
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {CRM_FINANCE_DETAIL_COPY.heroTitle}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{CRM_FINANCE_DETAIL_COPY.heroSubtitle}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-400">
              <span className="font-medium text-white">{playerName}</span>
              <span className="text-slate-600">•</span>
              <span>{payment.player.team?.name ?? "—"}</span>
              <span className="text-slate-600">•</span>
              <span>{periodLabel}</span>
              <span className="text-slate-600">•</span>
              <span className="font-semibold text-white">{payment.amount.toLocaleString("ru")} ₽</span>
              <span className="text-slate-600">•</span>
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                  STATUS_COLORS[payment.status] ?? "border-white/[0.08] bg-white/10 text-slate-400"
                )}
              >
                {payment.status}
              </span>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_FINANCE_DETAIL_COPY.sectionMainKicker}
              </p>
              <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {CRM_FINANCE_DETAIL_COPY.sectionMainTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_FINANCE_DETAIL_COPY.sectionMainHint}</p>
            </div>
            <dl className="divide-y divide-white/[0.06] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0">
                <dt className="text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.fieldPlayer}</dt>
                <dd className="text-right">
                  <Link href={`/players/${payment.player.id}`} className="font-medium text-slate-300 hover:text-neon-blue">
                    {playerName}
                  </Link>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.fieldTeam}</dt>
                <dd className="text-right text-white">{payment.player.team?.name ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.fieldPeriod}</dt>
                <dd className="text-right text-white">{periodLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.fieldAmount}</dt>
                <dd className="text-right text-white">{payment.amount.toLocaleString("ru")} ₽</dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.fieldStatus}</dt>
                <dd className="text-right">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      STATUS_COLORS[payment.status] ?? "border-white/[0.08] bg-white/10 text-slate-400"
                    )}
                  >
                    {payment.status}
                  </span>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.fieldPaidAt}</dt>
                <dd className="text-right text-white">
                  {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("ru-RU") : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 py-2.5 last:pb-0">
                <dt className="text-sm text-slate-500">{CRM_FINANCE_DETAIL_COPY.fieldComment}</dt>
                <dd className="max-w-[60%] text-right text-slate-300">{payment.comment || "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_FINANCE_DETAIL_COPY.sectionEditKicker}
              </p>
              <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {CRM_FINANCE_DETAIL_COPY.sectionEditTitle}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_FINANCE_DETAIL_COPY.sectionEditHint}</p>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div>
                <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_DETAIL_COPY.fieldAmount} (₽)</label>
                <input
                  type="number"
                  min={0}
                  value={edit.amount}
                  onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_DETAIL_COPY.fieldStatus}</label>
                <select
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_DETAIL_COPY.fieldPaidAt}</label>
                <input
                  type="date"
                  value={edit.paidAt}
                  onChange={(e) => setEdit({ ...edit, paidAt: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">{CRM_FINANCE_DETAIL_COPY.fieldComment}</label>
                <textarea
                  value={edit.comment}
                  onChange={(e) => setEdit({ ...edit, comment: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-white focus:border-white/20 focus:outline-none"
                  placeholder="Дополнительная информация"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Wallet className="h-4 w-4" aria-hidden />
                {saving ? CRM_FINANCE_DETAIL_COPY.savingCta : CRM_FINANCE_DETAIL_COPY.saveCta}
              </Button>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_FINANCE_DETAIL_COPY.sectionHistoryKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_FINANCE_DETAIL_COPY.sectionHistoryTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_FINANCE_DETAIL_COPY.sectionHistoryHint}</p>
          </div>
          <div className="space-y-2 p-5 text-sm text-slate-400 sm:p-6">
            <p>
              {CRM_FINANCE_DETAIL_COPY.fieldCreatedAt}: {new Date(payment.createdAt).toLocaleString("ru-RU")}
            </p>
            <p>
              {CRM_FINANCE_DETAIL_COPY.fieldUpdatedAt}: {new Date(payment.updatedAt).toLocaleString("ru-RU")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

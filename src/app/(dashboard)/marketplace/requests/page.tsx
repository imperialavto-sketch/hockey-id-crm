"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CRM_MARKETPLACE_COPY } from "@/lib/crmMarketplaceCopy";
import { cn } from "@/lib/utils";

interface BookingRequest {
  id: string;
  coachId: string;
  coachName: string;
  coachCity: string;
  parentName: string;
  parentPhone: string;
  playerId?: string | null;
  message: string;
  preferredDate: string | null;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: CRM_MARKETPLACE_COPY.statusNew,
  in_progress: CRM_MARKETPLACE_COPY.statusInProgress,
  confirmed: CRM_MARKETPLACE_COPY.statusConfirmed,
  declined: CRM_MARKETPLACE_COPY.statusDeclined,
};

const STATUS_PILL_CLASS: Record<string, string> = {
  new: "border-slate-500/35 bg-slate-500/15 text-slate-300",
  in_progress: "border-neon-blue/35 bg-neon-blue/15 text-neon-blue",
  confirmed: "border-neon-green/35 bg-neon-green/15 text-neon-green",
  declined: "border-amber-500/35 bg-amber-500/15 text-amber-200",
};

export default function MarketplaceRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const load = () => {
    setLoading(true);
    setFetchError(false);
    const params = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/admin/marketplace/booking-requests${params}`, {
      credentials: "include",
    })
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error("fetch failed");
        return Array.isArray(data) ? data : [];
      })
      .then((list) => {
        setRequests(list);
        setFetchError(false);
      })
      .catch(() => {
        setRequests([]);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [statusFilter, reloadTick]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/marketplace/booking-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) load();
    } catch {
      // ignore
    }
  };

  const summary = useMemo(() => {
    const total = requests.length;
    const newCount = requests.filter((r) => r.status === "new").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;
    const resolved = requests.filter((r) => r.status === "confirmed" || r.status === "declined").length;
    return { total, newCount, inProgress, resolved };
  }, [requests]);

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_MARKETPLACE_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_MARKETPLACE_COPY.loadingHint}</p>
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
              <p className="font-medium text-amber-100">{CRM_MARKETPLACE_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_MARKETPLACE_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_MARKETPLACE_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const emptyState = requests.length === 0;

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
              {CRM_MARKETPLACE_COPY.navDashboard}
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_MARKETPLACE_COPY.navMarketplace}
            </Link>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_MARKETPLACE_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_MARKETPLACE_COPY.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_MARKETPLACE_COPY.heroSubtitle}
              </p>
            </div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COPY.filtersKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COPY.filtersTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COPY.filtersHint}</p>
          </div>
          <div className="p-4 sm:p-5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
            >
              <option value="">{CRM_MARKETPLACE_COPY.allStatuses}</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COPY.summaryKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COPY.summaryTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COPY.summaryHint}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.statTotal}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.statNew}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.newCount}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.statInProgress}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.inProgress}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.statResolved}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.resolved}</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COPY.listKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COPY.listTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COPY.listHint}</p>
          </div>
          {emptyState ? (
            <div className="px-4 py-14 text-center sm:px-6">
              <FileText className="mx-auto h-11 w-11 text-slate-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-400">
                {statusFilter ? CRM_MARKETPLACE_COPY.emptyFilteredTitle : CRM_MARKETPLACE_COPY.emptyTitle}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
                {statusFilter ? CRM_MARKETPLACE_COPY.emptyFilteredHint : CRM_MARKETPLACE_COPY.emptyHint}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-start sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{r.parentName}</span>
                      <span className="text-slate-600">•</span>
                      <a
                        href={`tel:${r.parentPhone}`}
                        className="text-slate-300 transition-colors hover:text-neon-blue"
                      >
                        {r.parentPhone}
                      </a>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {CRM_MARKETPLACE_COPY.coachPrefix}: {r.coachName} ({r.coachCity})
                    </p>
                    {r.message ? <p className="mt-2 text-sm text-slate-300">{r.message}</p> : null}
                    {r.preferredDate ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {CRM_MARKETPLACE_COPY.preferredDatePrefix}:{" "}
                        {new Date(r.preferredDate).toLocaleDateString("ru-RU")}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-600">
                      {new Date(r.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                        STATUS_PILL_CLASS[r.status] ?? "border-white/[0.08] bg-white/[0.1] text-slate-400"
                      )}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {r.status === "new" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(r.id, "in_progress")}>
                          {CRM_MARKETPLACE_COPY.toWorkCta}
                        </Button>
                        <Button size="sm" onClick={() => updateStatus(r.id, "confirmed")}>
                          {CRM_MARKETPLACE_COPY.confirmCta}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(r.id, "declined")}>
                          {CRM_MARKETPLACE_COPY.declineCta}
                        </Button>
                      </div>
                    ) : null}
                    {r.status === "in_progress" ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(r.id, "confirmed")}>
                          {CRM_MARKETPLACE_COPY.confirmCta}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(r.id, "declined")}>
                          {CRM_MARKETPLACE_COPY.declineCta}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

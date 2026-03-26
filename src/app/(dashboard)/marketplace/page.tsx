"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Store, FileText, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { usePermissions } from "@/hooks/usePermissions";
import { CRM_MARKETPLACE_COPY } from "@/lib/crmMarketplaceCopy";

interface MarketplaceCoach {
  id: string;
  fullName: string;
  slug: string;
  city: string;
  specialties: string[];
  experienceYears: number;
  priceFrom: number;
  rating?: number | null;
  isPublished: boolean;
  servicesCount: number;
}

interface BookingRequest {
  id: string;
  status: string;
}

export default function MarketplacePage() {
  const { canCreate } = usePermissions();
  const [coaches, setCoaches] = useState<MarketplaceCoach[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    Promise.all([
      fetch("/api/admin/marketplace/coaches", { credentials: "include" }).then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error("coaches failed");
        return Array.isArray(data) ? data : [];
      }),
      fetch("/api/admin/marketplace/booking-requests", { credentials: "include" }).then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error("requests failed");
        return Array.isArray(data) ? data : [];
      }),
    ])
      .then(([coachesData, requestsData]) => {
        setCoaches(coachesData);
        setRequests(requestsData);
        setFetchError(false);
      })
      .catch(() => {
        setCoaches([]);
        setRequests([]);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [reloadTick]);

  const summary = useMemo(() => {
    const total = coaches.length;
    const published = coaches.filter((c) => c.isPublished).length;
    const drafts = total - published;
    const services = coaches.reduce((sum, c) => sum + (c.servicesCount ?? 0), 0);
    return { total, published, drafts, services };
  }, [coaches]);

  const pipeline = useMemo(() => {
    const total = requests.length;
    const fresh = requests.filter((r) => r.status === "new").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;
    const resolved = requests.filter((r) => r.status === "confirmed" || r.status === "declined").length;
    return { total, fresh, inProgress, resolved };
  }, [requests]);

  const filteredCoaches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coaches.filter((c) => {
      const nameOk = q.length === 0 || c.fullName.toLowerCase().includes(q);
      const statusOk =
        statusFilter === "all" ||
        (statusFilter === "published" && c.isPublished) ||
        (statusFilter === "draft" && !c.isPublished);
      return nameOk && statusOk;
    });
  }, [coaches, search, statusFilter]);

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_MARKETPLACE_COPY.hubLoadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubLoadingHint}</p>
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
              <p className="font-medium text-amber-100">{CRM_MARKETPLACE_COPY.hubErrorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_MARKETPLACE_COPY.hubErrorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_MARKETPLACE_COPY.hubRetryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const emptyState = coaches.length === 0;
  const filteredEmpty = !emptyState && filteredCoaches.length === 0;

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
              {CRM_MARKETPLACE_COPY.hubNavDashboard}
            </Link>
            <Link
              href="/marketplace/requests"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <FileText className="h-4 w-4" aria-hidden />
              {CRM_MARKETPLACE_COPY.hubRequestsCta}
            </Link>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_MARKETPLACE_COPY.hubEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_MARKETPLACE_COPY.hubTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_MARKETPLACE_COPY.hubSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/marketplace/requests" className="inline-flex">
                <Button variant="secondary" className="gap-2">
                  <FileText className="h-4 w-4" aria-hidden />
                  {CRM_MARKETPLACE_COPY.hubRequestsCta}
                </Button>
              </Link>
              {canCreate("marketplace") && (
                <Link href="/marketplace/new" className="inline-flex">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    {CRM_MARKETPLACE_COPY.hubAddCoachCta}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COPY.hubFiltersKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COPY.hubFiltersTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COPY.hubFiltersHint}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={CRM_MARKETPLACE_COPY.hubSearchPlaceholder}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="all">{CRM_MARKETPLACE_COPY.hubStatusAll}</option>
              <option value="published">{CRM_MARKETPLACE_COPY.hubStatusPublished}</option>
              <option value="draft">{CRM_MARKETPLACE_COPY.hubStatusDraft}</option>
            </select>
          </div>
        </Card>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COPY.hubSummaryKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COPY.hubSummaryTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COPY.hubSummaryHint}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatCoaches}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatPublished}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.published}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatDrafts}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.drafts}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatServices}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.services}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COPY.hubPipelineKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COPY.hubPipelineTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COPY.hubPipelineHint}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatReqTotal}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{pipeline.total}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatReqNew}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{pipeline.fresh}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatReqInProgress}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{pipeline.inProgress}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_MARKETPLACE_COPY.hubStatReqResolved}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{pipeline.resolved}</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COPY.hubListKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COPY.hubListTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COPY.hubListHint}</p>
          </div>
          {emptyState ? (
            <div className="px-4 py-14 text-center sm:px-6">
              <Store className="mx-auto h-11 w-11 text-slate-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-400">{CRM_MARKETPLACE_COPY.hubEmptyTitle}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
                {CRM_MARKETPLACE_COPY.hubEmptyHint}
              </p>
              {canCreate("marketplace") ? (
                <Link href="/marketplace/new" className="mt-6 inline-flex">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    {CRM_MARKETPLACE_COPY.hubAddCoachCta}
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : filteredEmpty ? (
            <div className="px-4 py-14 text-center sm:px-6">
              <Store className="mx-auto h-11 w-11 text-slate-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-400">{CRM_MARKETPLACE_COPY.hubEmptyFilteredTitle}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
                {CRM_MARKETPLACE_COPY.hubEmptyFilteredHint}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-left text-slate-400">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_MARKETPLACE_COPY.hubColCoach}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_MARKETPLACE_COPY.hubColCity}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_MARKETPLACE_COPY.hubColSpecialties}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_MARKETPLACE_COPY.hubColOffer}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_MARKETPLACE_COPY.hubColStatus}</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider sm:px-5">{CRM_MARKETPLACE_COPY.hubColActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoaches.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.06] text-white transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3.5 font-medium sm:px-5">{c.fullName}</td>
                      <td className="px-4 py-3.5 text-slate-400 sm:px-5">{c.city || CRM_MARKETPLACE_COPY.hubNoCity}</td>
                      <td className="px-4 py-3.5 text-slate-300 sm:px-5">
                        {(c.specialties ?? []).length > 0
                          ? (c.specialties ?? []).slice(0, 3).join(", ")
                          : CRM_MARKETPLACE_COPY.hubNoSpecialty}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 sm:px-5">
                        {c.experienceYears} лет / от {c.priceFrom} ₽
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-slate-300">
                          {c.isPublished ? CRM_MARKETPLACE_COPY.hubPublishedLabel : CRM_MARKETPLACE_COPY.hubDraftLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <Link
                          href={`/marketplace/coaches/${c.id}`}
                          className="inline-flex items-center gap-1 text-slate-300 transition-colors hover:text-neon-blue"
                        >
                          {CRM_MARKETPLACE_COPY.hubEditCoachCta}
                          <ChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

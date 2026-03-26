"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CRM_MARKETPLACE_COACH_DETAIL_COPY } from "@/lib/crmMarketplaceCoachDetailCopy";

const SPECIALTY_OPTIONS = [
  "Катание",
  "Бросок",
  "Дриблинг",
  "Вратари",
  "ОФП",
  "Подкатка",
  "Индивидуальная тренировка",
  "Баланс",
  "Скорость",
];

const FORMAT_OPTIONS = [
  { value: "individual", label: "Индивидуально" },
  { value: "group", label: "Группы" },
  { value: "online", label: "Онлайн" },
  { value: "offline", label: "Оффлайн" },
];

export default function MarketplaceCoachEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    city: "",
    bio: "",
    specialties: [] as string[],
    experienceYears: 0,
    priceFrom: 0,
    rating: "" as number | "",
    trainingFormats: [] as string[],
    isPublished: false,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setFetchError(false);
    setNotFound(false);
    fetch(`/api/admin/marketplace/coaches/${id}`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("fetch failed");
        return data;
      })
      .then((data) => {
        if (!data?.id && !data?.fullName) {
          setNotFound(true);
          return;
        }
        setForm({
          fullName: data.fullName ?? "",
          city: data.city ?? "",
          bio: data.bio ?? "",
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          experienceYears: data.experienceYears ?? 0,
          priceFrom: data.priceFrom ?? 0,
          rating: data.rating != null ? data.rating : "",
          trainingFormats: Array.isArray(data.trainingFormats) ? data.trainingFormats : [],
          isPublished: Boolean(data.isPublished),
        });
        setFetchError(false);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  const toggleSpecialty = (s: string) => {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter((x) => x !== s)
        : [...f.specialties, s],
    }));
  };

  const toggleFormat = (v: string) => {
    setForm((f) => ({
      ...f,
      trainingFormats: f.trainingFormats.includes(v)
        ? f.trainingFormats.filter((x) => x !== v)
        : [...f.trainingFormats, v],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketplace/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          city: form.city.trim(),
          bio: form.bio.trim() || null,
          specialties: form.specialties,
          experienceYears: Number(form.experienceYears) || 0,
          priceFrom: Number(form.priceFrom) || 0,
          rating: form.rating !== "" ? Number(form.rating) : null,
          trainingFormats: form.trainingFormats,
          isPublished: form.isPublished,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data?.error ?? CRM_MARKETPLACE_COACH_DETAIL_COPY.saveErrorDefault);
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setSaveError(CRM_MARKETPLACE_COACH_DETAIL_COPY.saveErrorDefault);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_MARKETPLACE_COACH_DETAIL_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_MARKETPLACE_COACH_DETAIL_COPY.loadingHint}</p>
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
            <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.navMarketplace}
            </Link>
            <Link href="/marketplace/requests" className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.navRequests}
            </Link>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="alert">
            <div>
              <p className="font-medium text-amber-100">{CRM_MARKETPLACE_COACH_DETAIL_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_MARKETPLACE_COACH_DETAIL_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.navMarketplace}
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.navDashboard}
            </Link>
          </div>
          <div className="mx-auto max-w-2xl">
            <Card className="border-white/[0.08] p-8 text-center">
              <p className="font-display text-lg font-semibold text-white">{CRM_MARKETPLACE_COACH_DETAIL_COPY.notFoundTitle}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{CRM_MARKETPLACE_COACH_DETAIL_COPY.notFoundHint}</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = form.isPublished
    ? CRM_MARKETPLACE_COACH_DETAIL_COPY.published
    : CRM_MARKETPLACE_COACH_DETAIL_COPY.draft;

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.navMarketplace}
            </Link>
            <Link href="/marketplace/requests" className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.navRequests}
            </Link>
          </div>

          <Card className="rounded-2xl border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.heroEyebrow}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {form.fullName || CRM_MARKETPLACE_COACH_DETAIL_COPY.heroTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.heroSubtitle}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
              <span>{form.city || "—"}</span>
              <span className="text-slate-600">•</span>
              <span className={form.isPublished ? "text-emerald-300" : "text-slate-500"}>{statusLabel}</span>
            </p>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionSummaryKicker}
            </p>
            <h2 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionSummaryTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionSummaryHint}</p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_MARKETPLACE_COACH_DETAIL_COPY.statCity}</p>
              <p className="mt-1 text-sm font-medium text-white">{form.city || "—"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_MARKETPLACE_COACH_DETAIL_COPY.statStatus}</p>
              <p className="mt-1 text-sm font-medium text-white">{statusLabel}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_MARKETPLACE_COACH_DETAIL_COPY.statSpecialties}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">{form.specialties.length}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_MARKETPLACE_COACH_DETAIL_COPY.statFormats}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">{form.trainingFormats.length}</p>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {saveError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
              {saveError}
            </div>
          )}

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionMainKicker}
              </p>
              <h3 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionMainTitle}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionMainHint}</p>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Имя и фамилия *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Город *</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">О тренере</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionExpertiseKicker}
              </p>
              <h3 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionExpertiseTitle}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionExpertiseHint}</p>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Специализации</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpecialty(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        form.specialties.includes(s)
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Форматы занятий</label>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleFormat(o.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        form.trainingFormats.includes(o.value)
                          ? "border-white/20 bg-white/10 text-white"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionCommerceKicker}
              </p>
              <h3 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionCommerceTitle}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionCommerceHint}</p>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Опыт (лет)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.experienceYears || ""}
                    onChange={(e) => setForm({ ...form, experienceYears: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-400">Цена от (₽)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.priceFrom || ""}
                    onChange={(e) => setForm({ ...form, priceFrom: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Рейтинг</label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={5}
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                  className="w-24 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white"
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionPublishKicker}
              </p>
              <h3 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionPublishTitle}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_MARKETPLACE_COACH_DETAIL_COPY.sectionPublishHint}</p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="published"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20"
                />
                <label htmlFor="published" className="text-sm text-slate-400">
                  Опубликовать (виден родителям)
                </label>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? CRM_MARKETPLACE_COACH_DETAIL_COPY.savingCta : CRM_MARKETPLACE_COACH_DETAIL_COPY.saveCta}
            </Button>
            <Link href="/marketplace">
              <Button type="button" variant="secondary">
                {CRM_MARKETPLACE_COACH_DETAIL_COPY.cancelCta}
              </Button>
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-1 px-2 text-sm text-slate-500 transition-colors hover:text-neon-blue">
              {CRM_MARKETPLACE_COACH_DETAIL_COPY.navDashboard}
              <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

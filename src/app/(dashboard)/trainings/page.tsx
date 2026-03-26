"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, Clock, MapPin, Users, Loader2, ChevronRight, User, ArrowLeft } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import {
  CRM_TRAININGS_LIST_COPY,
  crmTrainingListTimeMeta,
} from "@/lib/crmTrainingsListCopy";
import { CRM_PLAYER_DETAIL_COPY } from "@/lib/crmPlayerDetailCopy";
import { crmTeamTrainingsCountLabel } from "@/lib/crmTeamsListCopy";

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  team?: {
    name: string;
    ageGroup: string;
    coach?: { firstName?: string; lastName?: string } | null;
  } | null;
}

function timeMetaPillClass(meta: string): string {
  if (meta === CRM_TRAININGS_LIST_COPY.metaLive) {
    return "border-neon-green/35 bg-neon-green/15 text-neon-green";
  }
  if (meta === CRM_TRAININGS_LIST_COPY.metaUpcoming) {
    return "border-neon-blue/35 bg-neon-blue/15 text-neon-blue";
  }
  if (meta === CRM_TRAININGS_LIST_COPY.metaPast) {
    return "border-white/15 bg-white/[0.06] text-slate-400";
  }
  return "border-white/15 bg-white/[0.06] text-slate-500";
}

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    fetch("/api/trainings")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("fetch failed");
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.trainings)) return data.trainings;
        return [];
      })
      .then((list) => {
        setTrainings(list);
        setFetchError(false);
      })
      .catch(() => {
        setFetchError(true);
        setTrainings([]);
      })
      .finally(() => setLoading(false));
  }, [loadTick]);

  const safeTrainings = Array.isArray(trainings) ? trainings : [];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
        <div className="text-center">
          <p className="font-display text-base font-semibold text-white">{CRM_TRAININGS_LIST_COPY.loadingTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{CRM_TRAININGS_LIST_COPY.loadingHint}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {fetchError ? (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_TRAININGS_LIST_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_TRAININGS_LIST_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setLoadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_TRAININGS_LIST_COPY.retryCta}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_TRAININGS_LIST_COPY.scheduleLink}
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_TRAININGS_LIST_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_TRAININGS_LIST_COPY.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_TRAININGS_LIST_COPY.heroSubtitle}
              </p>
            </div>
            <Link href="/trainings/new" className="shrink-0">
              <Button className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                {CRM_TRAININGS_LIST_COPY.addTrainingCta}
              </Button>
            </Link>
          </div>
        </div>

        {!fetchError && safeTrainings.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] px-6 py-16 text-center sm:px-10">
            <Calendar className="mx-auto h-12 w-12 text-slate-600" aria-hidden />
            <p className="mt-4 text-lg font-semibold text-slate-200">{CRM_TRAININGS_LIST_COPY.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {CRM_TRAININGS_LIST_COPY.emptyHint}
            </p>
            <Link href="/trainings/new" className="mt-8 inline-block">
              <Button className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                {CRM_TRAININGS_LIST_COPY.emptyAddCta}
              </Button>
            </Link>
          </div>
        ) : null}

        {!fetchError && safeTrainings.length > 0 ? (
          <Card className="overflow-hidden rounded-2xl border-white/[0.1] p-0">
            <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {CRM_TRAININGS_LIST_COPY.listKicker}
              </p>
              <div className="mt-0.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                  {CRM_TRAININGS_LIST_COPY.listTitle}
                </h2>
                <p className="text-sm text-slate-500">{crmTeamTrainingsCountLabel(safeTrainings.length)}</p>
              </div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {safeTrainings.map((t) => {
                const start = t.startTime ? new Date(t.startTime) : null;
                const end = t.endTime ? new Date(t.endTime) : null;
                const meta =
                  t.startTime && t.endTime ? crmTrainingListTimeMeta(t.startTime, t.endTime) : "";
                const teamName = t.team?.name ?? CRM_PLAYER_DETAIL_COPY.noTeam;
                const ageSuffix = t.team?.ageGroup ? ` · ${t.team.ageGroup}` : "";
                const coach = t.team?.coach
                  ? [t.team.coach.firstName, t.team.coach.lastName].filter(Boolean).join(" ")
                  : "";

                return (
                  <Link key={t.id} href={`/trainings/${t.id}`} className="block">
                    <div className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-neon-blue/15">
                          <Calendar className="h-5 w-5 text-neon-blue" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 gap-y-1">
                            <h3 className="font-display text-base font-semibold tracking-tight text-white">
                              {t.title}
                            </h3>
                            {meta ? (
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  timeMetaPillClass(meta)
                                )}
                              >
                                {meta}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                            {start ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                                {start.toLocaleDateString("ru-RU", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                            {start && end ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                                {start.toLocaleTimeString("ru-RU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                –
                                {end.toLocaleTimeString("ru-RU", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : null}
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                              <span className="truncate">
                                {teamName}
                                {ageSuffix}
                              </span>
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-500">
                              <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                              <span className="truncate">
                                {t.location ?? CRM_TRAININGS_LIST_COPY.noLocation}
                              </span>
                            </span>
                          </div>
                          {coach ? (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                              <User className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                              {CRM_TRAININGS_LIST_COPY.coachPrefix}: {coach}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight
                        className="h-5 w-5 shrink-0 self-end text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-neon-blue sm:self-center sm:opacity-40 sm:group-hover:opacity-100"
                        aria-hidden
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

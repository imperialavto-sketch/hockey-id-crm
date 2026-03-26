"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  List,
  MapPin,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { CRM_SCHEDULE_COPY } from "@/lib/crmScheduleCopy";
import { CRM_TEAMS_LIST_COPY, crmTeamTrainingsCountLabel } from "@/lib/crmTeamsListCopy";
import { CRM_PLAYER_DETAIL_COPY } from "@/lib/crmPlayerDetailCopy";

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  team?: {
    name: string;
    coach?: { firstName: string; lastName: string } | null;
  } | null;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

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

export default function SchedulePage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    fetch("/api/trainings")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("fetch failed");
        if (Array.isArray(data)) return data;
        if (data?.data) return data.data;
        if (data?.trainings) return data.trainings;
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
  const trainingsByDate = safeTrainings.reduce(
    (acc, t) => {
      const d = new Date(t.startTime);
      const key = d.toISOString().slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<string, Training[]>
  );

  const calendarDays: Date[] = [];
  const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const end = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
  const startPad = (start.getDay() + 6) % 7;
  for (let i = 0; i < startPad; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - (startPad - i));
    calendarDays.push(d);
  }
  for (let d = 1; d <= end.getDate(); d++) {
    calendarDays.push(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), d));
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const last = calendarDays[calendarDays.length - 1];
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    calendarDays.push(d);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
        <div className="text-center">
          <p className="font-display text-base font-semibold text-white">{CRM_SCHEDULE_COPY.loadingTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{CRM_SCHEDULE_COPY.loadingHint}</p>
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
              <p className="font-medium text-amber-100">{CRM_SCHEDULE_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_SCHEDULE_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setLoadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_SCHEDULE_COPY.retryCta}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
              {CRM_SCHEDULE_COPY.heroEyebrow}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {CRM_SCHEDULE_COPY.heroTitle}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              {CRM_SCHEDULE_COPY.heroSubtitle}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:shrink-0 sm:items-end">
            <Card className="rounded-2xl border-white/[0.08] p-0">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5 sm:px-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {CRM_SCHEDULE_COPY.viewKicker}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{CRM_SCHEDULE_COPY.viewHint}</p>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                <div className="inline-flex rounded-xl border border-white/[0.12] bg-white/[0.04] p-1">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                      view === "list"
                        ? "bg-neon-blue/20 text-neon-blue"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <List className="h-4 w-4 shrink-0" aria-hidden />
                    {CRM_SCHEDULE_COPY.listView}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("calendar")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                      view === "calendar"
                        ? "bg-neon-blue/20 text-neon-blue"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                    {CRM_SCHEDULE_COPY.calendarView}
                  </button>
                </div>
                <Link href="/trainings/new" className="inline-flex">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden />
                    {CRM_SCHEDULE_COPY.addTrainingCta}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {!fetchError && view === "list" ? (
          safeTrainings.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] px-6 py-16 text-center sm:px-10">
              <Calendar className="mx-auto h-12 w-12 text-slate-600" aria-hidden />
              <p className="mt-4 text-lg font-semibold text-slate-200">{CRM_SCHEDULE_COPY.emptyTitle}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                {CRM_SCHEDULE_COPY.emptyHint}
              </p>
              <Link href="/trainings/new" className="mt-8 inline-block">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden />
                  {CRM_SCHEDULE_COPY.emptyAddCta}
                </Button>
              </Link>
            </div>
          ) : (
            <Card className="overflow-hidden rounded-2xl border-white/[0.1] p-0">
              <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {CRM_SCHEDULE_COPY.listKicker}
                </p>
                <div className="mt-0.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                    {CRM_SCHEDULE_COPY.listTitle}
                  </h2>
                  <p className="text-sm text-slate-500">{crmTeamTrainingsCountLabel(safeTrainings.length)}</p>
                </div>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {safeTrainings.map((t) => {
                  const start = new Date(t.startTime);
                  const end = new Date(t.endTime);
                  const teamName = t.team?.name ?? CRM_PLAYER_DETAIL_COPY.noTeam;
                  return (
                    <Link key={t.id} href={`/trainings/${t.id}`} className="block">
                      <div className="group flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-neon-blue/15">
                            <Calendar className="h-6 w-6 text-neon-blue" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                              {t.title}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                                {start.toLocaleDateString("ru-RU", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
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
                              {t.location ? (
                                <span className="inline-flex min-w-0 items-center gap-1.5">
                                  <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                                  <span className="truncate">{t.location}</span>
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1.5">
                                <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                                <span className="truncate">{teamName}</span>
                              </span>
                            </div>
                            {t.team?.coach ? (
                              <p className="mt-2 text-sm text-slate-500">
                                {CRM_TEAMS_LIST_COPY.coachPrefix}: {t.team.coach.firstName}{" "}
                                {t.team.coach.lastName}
                              </p>
                            ) : null}
                            {t.notes ? (
                              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{t.notes}</p>
                            ) : null}
                          </div>
                        </div>
                        <ChevronRight
                          className="h-5 w-5 shrink-0 self-center text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-neon-blue sm:self-auto"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )
        ) : null}

        {!fetchError && view === "calendar" ? (
          <Card className="overflow-hidden rounded-2xl border-white/[0.1] p-0">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.02] px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))
                }
                className="rounded-xl border border-white/[0.1] p-2 text-slate-400 transition-colors hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <div className="min-w-0 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {CRM_SCHEDULE_COPY.calendarKicker}
                </p>
                <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                  {MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))
                }
                className="rounded-xl border border-white/[0.1] p-2 text-slate-400 transition-colors hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white"
                aria-label="Следующий месяц"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-7 gap-1 text-center text-sm sm:gap-1.5">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {d}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const key = day.toISOString().slice(0, 10);
                  const dayTrainings = trainingsByDate[key] ?? [];
                  const isCurrentMonth = day.getMonth() === calendarDate.getMonth();
                  const isToday = key === new Date().toISOString().slice(0, 10);
                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-[72px] rounded-xl border p-1.5 sm:min-h-[88px] sm:p-2",
                        isCurrentMonth
                          ? "border-white/[0.08] bg-white/[0.03]"
                          : "border-transparent bg-transparent",
                        isToday && "ring-2 ring-inset ring-neon-blue/50"
                      )}
                    >
                      <span className={cn("text-xs font-medium sm:text-sm", isCurrentMonth ? "text-white" : "text-slate-600")}>
                        {day.getDate()}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayTrainings.slice(0, 2).map((tr) => (
                          <Link
                            key={tr.id}
                            href={`/trainings/${tr.id}`}
                            className="block truncate rounded-md border border-neon-blue/20 bg-neon-blue/15 px-1 py-0.5 text-left text-[10px] font-medium text-neon-blue transition-colors hover:border-neon-blue/40 hover:bg-neon-blue/25 sm:text-xs"
                          >
                            {tr.title}
                          </Link>
                        ))}
                        {dayTrainings.length > 2 ? (
                          <span className="text-[10px] text-slate-500 sm:text-xs">+{dayTrainings.length - 2}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

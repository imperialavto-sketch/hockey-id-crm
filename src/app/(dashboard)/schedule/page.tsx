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
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

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

export default function SchedulePage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/trainings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) return data;
        if (data?.data) return data.data;
        if (data?.trainings) return data.trainings;
        return [];
      })
      .then(setTrainings)
      .catch(() => setTrainings([]))
      .finally(() => setLoading(false));
  }, []);

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

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Расписание
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Календарь тренировок школы
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border border-white/20 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-neon-blue/20 text-neon-blue"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="mr-2 inline h-4 w-4" />
              Список
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === "calendar"
                  ? "bg-neon-blue/20 text-neon-blue"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="mr-2 inline h-4 w-4" />
              Календарь
            </button>
          </div>
          <Link href="/trainings/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Тренировка
            </Button>
          </Link>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-4">
          {safeTrainings.length === 0 ? (
            <Card className="py-16 text-center">
              <Calendar className="mx-auto h-14 w-14 text-slate-600" />
              <p className="mt-4 text-lg text-slate-400">Тренировки не запланированы</p>
              <Link href="/trainings/new" className="mt-4 inline-block">
                <Button>+ Добавить тренировку</Button>
              </Link>
            </Card>
          ) : (
            safeTrainings.map((t) => {
              const start = new Date(t.startTime);
              const end = new Date(t.endTime);
              return (
                <Link key={t.id} href={`/trainings/${t.id}`}>
                  <Card className="transition-all hover:border-neon-blue/40 hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-neon-blue/30 bg-neon-blue/10">
                          <Calendar className="h-7 w-7 text-neon-blue" />
                        </div>
                        <div>
                          <h2 className="font-display text-lg font-semibold text-white">
                            {t.title}
                          </h2>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {start.toLocaleDateString("ru-RU", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
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
                            {t.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {t.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {t.team?.name ?? "—"}
                            </span>
                          </div>
                          {t.team?.coach && (
                            <p className="mt-1 text-sm text-slate-500">
                              Тренер: {t.team.coach.firstName} {t.team.coach.lastName}
                            </p>
                          )}
                          {t.notes && (
                            <p className="mt-2 text-sm text-slate-500">{t.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      ) : (
        <Card className="border-neon-blue/20 p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCalendarDate(
                  new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1)
                )
              }
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="font-display text-lg font-semibold text-white">
              {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
            </h2>
            <button
              type="button"
              onClick={() =>
                setCalendarDate(
                  new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1)
                )
              }
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <div key={d} className="py-2 text-slate-500">
                {d}
              </div>
            ))}
            {calendarDays.map((day) => {
              const key = day.toISOString().slice(0, 10);
              const dayTrainings = trainingsByDate[key] ?? [];
              const isCurrentMonth =
                day.getMonth() === calendarDate.getMonth();
              const isToday =
                key === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={key}
                  className={`min-h-[80px] rounded-lg border p-2 ${
                    isCurrentMonth
                      ? "border-white/10 bg-white/5"
                      : "border-transparent bg-transparent"
                  } ${isToday ? "ring-2 ring-neon-blue" : ""}`}
                >
                  <span
                    className={
                      isCurrentMonth ? "text-white" : "text-slate-600"
                    }
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayTrainings.slice(0, 2).map((tr) => (
                      <Link
                        key={tr.id}
                        href={`/trainings/${tr.id}`}
                        className="block truncate rounded bg-neon-blue/20 px-1 py-0.5 text-xs text-neon-blue hover:bg-neon-blue/30"
                      >
                        {tr.title}
                      </Link>
                    ))}
                    {dayTrainings.length > 2 && (
                      <span className="text-xs text-slate-500">
                        +{dayTrainings.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

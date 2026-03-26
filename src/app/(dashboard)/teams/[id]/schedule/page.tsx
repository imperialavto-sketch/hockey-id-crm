"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { normalizeWeekStartDateParam } from "@/lib/schedule-week";
import { CRM_TEAM_SCHEDULE_COPY } from "@/lib/crmTeamScheduleCopy";

const INPUT_CLASS =
  "mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20";

const TYPE_OPTIONS = [
  { value: "ice", label: "Лёд" },
  { value: "ofp", label: "ОФП" },
];

interface SessionRow {
  id: string;
  type: string;
  startAt: string;
  endAt: string;
  locationName: string | null;
  notes: string | null;
  teamName?: string;
  group: { id: string; name: string; level: number };
}

interface TeamGroup {
  id: string;
  name: string;
  level: number;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekStartMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function weekDays(weekStart: Date): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(weekStart);
    x.setDate(weekStart.getDate() + i);
    out.push(x);
  }
  return out;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function TeamSchedulePage() {
  const params = useParams();
  const teamId = (params?.id as string) ?? "";
  const [weekStart, setWeekStart] = useState(() => weekStartMonday(new Date()));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: ymd(new Date()),
    startTime: "18:00",
    endTime: "19:30",
    type: "ice",
    groupId: "",
    locationName: "",
    notes: "",
  });

  const weekKey =
    normalizeWeekStartDateParam(ymd(weekStart)) ?? ymd(weekStart);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const [sRes, gRes] = await Promise.all([
        fetch(
          `/api/trainings?teamId=${encodeURIComponent(teamId)}&weekStartDate=${encodeURIComponent(weekKey)}`
        ),
        fetch(`/api/groups?teamId=${encodeURIComponent(teamId)}`),
      ]);
      const sData = await sRes.json().catch(() => null);
      const gData = await gRes.json().catch(() => null);
      if (!sRes.ok) throw new Error(typeof sData?.error === "string" ? sData.error : "fetch failed");
      setSessions(Array.isArray(sData) ? sData : []);
      if (gRes.ok && Array.isArray(gData)) {
        setGroups(gData);
        setForm((f) => ({
          ...f,
          groupId: f.groupId || gData[0]?.id || "",
        }));
      } else {
        setGroups([]);
      }
    } catch (e) {
      setFetchError(e instanceof Error && e.message ? e.message : CRM_TEAM_SCHEDULE_COPY.errorHint);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [teamId, weekKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const key = ymd(new Date(s.startAt));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
    }
    return map;
  }, [sessions]);

  const days = weekDays(weekStart);
  const sessionsCount = sessions.length;
  const nextSession = sessions
    .slice()
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null;
  const groupsInWeek = new Set(sessions.map((s) => s.group.id)).size;
  const typeCount = new Set(sessions.map((s) => s.type)).size;

  const buildIso = (dateStr: string, timeStr: string): string | null => {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
    const dt = new Date(y, mo - 1, d, h, mi, 0);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const startAt = buildIso(form.date, form.startTime);
    const endAt = buildIso(form.date, form.endTime);
    if (!startAt || !endAt) {
      setFormError("Проверьте дату и время");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setFormError("Время окончания должно быть позже начала");
      return;
    }
    if (!form.groupId) {
      setFormError("Выберите группу (создайте на странице «Группы»)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          groupId: form.groupId,
          type: form.type,
          startAt,
          endAt,
          locationName: form.locationName.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error ?? "Не удалось сохранить");
        return;
      }
      setShowForm(false);
      await load();
    } catch {
      setFormError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm(CRM_TEAM_SCHEDULE_COPY.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/trainings/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch {
      /* ignore */
    }
  };

  if (!teamId) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="border-white/[0.08] p-8 text-center">
            <p className="font-display text-lg font-semibold text-white">{CRM_TEAM_SCHEDULE_COPY.invalidTeamTitle}</p>
            <p className="mt-2 text-sm text-slate-500">{CRM_TEAM_SCHEDULE_COPY.invalidTeamHint}</p>
            <div className="mt-6">
              <Link href="/teams" className="inline-flex">
                <Button>{CRM_TEAM_SCHEDULE_COPY.invalidTeamBack}</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const refresh = () => void load();

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/teams/${teamId}`}
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_TEAM_SCHEDULE_COPY.navBackTeam}
            </Link>
            <Link
              href="/schedule"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue"
            >
              {CRM_TEAM_SCHEDULE_COPY.navBackSchedule}
            </Link>
          </div>

          <Card className="rounded-2xl border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
              {CRM_TEAM_SCHEDULE_COPY.heroEyebrow}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {CRM_TEAM_SCHEDULE_COPY.heroTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              {CRM_TEAM_SCHEDULE_COPY.heroSubtitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/teams/${teamId}/groups`} className="inline-flex">
                <Button variant="secondary" size="sm">{CRM_TEAM_SCHEDULE_COPY.groupsCta}</Button>
              </Link>
              <Link href={`/teams/${teamId}/assignments`} className="inline-flex">
                <Button variant="secondary" size="sm">{CRM_TEAM_SCHEDULE_COPY.assignmentsCta}</Button>
              </Link>
              <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {CRM_TEAM_SCHEDULE_COPY.addTrainingCta}
              </Button>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_TEAM_SCHEDULE_COPY.weekRangeLabel}
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
                {weekKey}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const p = new Date(weekStart);
                    p.setDate(p.getDate() - 7);
                    setWeekStart(weekStartMonday(p));
                  }}
                  className="rounded-lg border border-white/[0.08] p-2 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                  aria-label="Предыдущая неделя"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const n = new Date(weekStart);
                    n.setDate(n.getDate() + 7);
                    setWeekStart(weekStartMonday(n));
                  }}
                  className="rounded-lg border border-white/[0.08] p-2 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                  aria-label="Следующая неделя"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_TEAM_SCHEDULE_COPY.summaryTotal}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">{sessionsCount}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_TEAM_SCHEDULE_COPY.summaryNext}</p>
              <p className="mt-1 text-sm font-medium text-white">
                {nextSession ? `${WD[new Date(nextSession.startAt).getDay() === 0 ? 6 : new Date(nextSession.startAt).getDay() - 1]} ${formatTime(nextSession.startAt)}` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_TEAM_SCHEDULE_COPY.summaryTypes}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">{typeCount}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_TEAM_SCHEDULE_COPY.summaryGroups}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">{groupsInWeek}</p>
            </div>
          </div>
        </Card>

      {loading ? (
        <Card className="rounded-2xl border-white/[0.08] p-0">
          <div className="flex min-h-[36vh] flex-col items-center justify-center gap-4 py-14">
            <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
            <div className="text-center">
              <p className="font-display text-base font-semibold text-white">{CRM_TEAM_SCHEDULE_COPY.loadingTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{CRM_TEAM_SCHEDULE_COPY.loadingHint}</p>
            </div>
          </div>
        </Card>
      ) : fetchError ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          role="alert"
        >
          <div>
            <p className="font-medium text-amber-100">{CRM_TEAM_SCHEDULE_COPY.errorTitle}</p>
            <p className="mt-0.5 text-sm text-amber-200/80">{fetchError}</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            {CRM_TEAM_SCHEDULE_COPY.retryCta}
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="rounded-2xl border-white/[0.08] p-0 text-center">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_TEAM_SCHEDULE_COPY.sectionKicker}</p>
            <h2 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_TEAM_SCHEDULE_COPY.sectionTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_TEAM_SCHEDULE_COPY.sectionHint}</p>
          </div>
          <div className="py-12">
            <p className="font-display text-lg font-semibold text-white">{CRM_TEAM_SCHEDULE_COPY.weekEmptyTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{CRM_TEAM_SCHEDULE_COPY.weekEmptyHint}</p>
          </div>
        </Card>
      ) : (
        <Card className="rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_TEAM_SCHEDULE_COPY.sectionKicker}</p>
            <h2 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_TEAM_SCHEDULE_COPY.sectionTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_TEAM_SCHEDULE_COPY.sectionHint}</p>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
          {days.map((day, i) => {
            const key = ymd(day);
            const list = byDay.get(key) ?? [];
            return (
              <div key={key} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <h3 className="mb-3 font-display text-sm font-semibold text-slate-300">
                  {WD[i]} {day.getDate()}.
                  {String(day.getMonth() + 1).padStart(2, "0")}
                </h3>
                {list.length === 0 ? (
                  <p className="text-sm text-slate-500">{CRM_TEAM_SCHEDULE_COPY.dayEmpty}</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {TYPE_OPTIONS.find((t) => t.value === s.type)?.label ??
                              s.type}{" "}
                            · {s.group.name}
                          </p>
                          <p className="text-sm text-slate-400">
                            {formatTime(s.startAt)} – {formatTime(s.endAt)}
                            {s.locationName ? ` · ${s.locationName}` : ""}
                          </p>
                          {s.notes ? (
                            <p className="mt-1 text-xs text-slate-500">{s.notes}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSession(s.id)}
                          className="text-slate-500 transition-colors hover:text-red-400"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          </div>
        </Card>
      )}
        </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto border-white/[0.08] p-6">
            <h2 className="mb-4 font-display text-lg text-white">
              {CRM_TEAM_SCHEDULE_COPY.createTitle}
            </h2>
            <form onSubmit={submitForm} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Дата</label>
                <input
                  type="date"
                  className={INPUT_CLASS}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Начало</label>
                  <input
                    type="time"
                    className={INPUT_CLASS}
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startTime: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Конец</label>
                  <input
                    type="time"
                    className={INPUT_CLASS}
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, endTime: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Тип</label>
                <select
                  className={INPUT_CLASS}
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Группа</label>
                <select
                  className={INPUT_CLASS}
                  value={form.groupId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, groupId: e.target.value }))
                  }
                  required
                >
                  <option value="">—</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (ур. {g.level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Локация</label>
                <input
                  className={INPUT_CLASS}
                  value={form.locationName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, locationName: e.target.value }))
                  }
                  placeholder="Ледовая арена…"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Комментарий</label>
                <textarea
                  className={INPUT_CLASS}
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Сохранение…" : "Сохранить"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

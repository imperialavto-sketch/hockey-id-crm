"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Repeat } from "lucide-react";
import { Button } from "@/components/Button";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
}

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue";

export default function NewTrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamIdFromUrl = searchParams.get("teamId") ?? "";
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recurring, setRecurring] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    startDate: todayIso,
    startTime: "18:00",
    durationMinutes: 90,
    location: "",
    teamId: teamIdFromUrl,
    notes: "",
    weekdays: [1, 3, 5] as number[],
    weeks: 4,
  });

  useEffect(() => {
    if (teamIdFromUrl) setForm((f) => ({ ...f, teamId: teamIdFromUrl }));
  }, [teamIdFromUrl]);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.teams)) return data.teams;
        return [];
      })
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  const safeTeams = Array.isArray(teams) ? teams : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (recurring) {
        const res = await fetch("/api/trainings/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            teamId: form.teamId,
            startDate: form.startDate,
            startTime: form.startTime,
            durationMinutes: form.durationMinutes,
            location: form.location || null,
            notes: form.notes || null,
            weekdays: form.weekdays,
            weeks: form.weeks,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? "Ошибка создания");
          setLoading(false);
          return;
        }
        router.push("/schedule");
        return;
      }

      const [year, month, day] = form.startDate.split("-").map(Number);
      const [hour, min] = form.startTime.split(":").map(Number);
      const start = new Date(year, month - 1, day, hour || 18, min || 0, 0);
      const end = new Date(start.getTime() + (form.durationMinutes || 90) * 60 * 1000);

      const res = await fetch("/api/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          location: form.location || null,
          teamId: form.teamId || undefined,
          notes: form.notes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Ошибка сохранения");
        setLoading(false);
        return;
      }

      router.push(`/trainings/${data.id}`);
    } catch {
      setError("Ошибка сохранения");
      setLoading(false);
    }
  };


  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/trainings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Добавить тренировку
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Создание новой тренировки
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(0,212,255,0.08)]">
          <div className="space-y-6 p-6 sm:p-8">
            {error && (
              <p className="rounded-lg border border-neon-pink/40 bg-neon-pink/10 px-4 py-2 text-sm text-neon-pink">
                {error}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400">Команда *</label>
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                className={INPUT_CLASS}
                required
              >
                <option value="">Выберите команду</option>
                {safeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.ageGroup})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Название *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={INPUT_CLASS}
                placeholder="Тренировка"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="rounded border-white/20 bg-white/5"
              />
              <label htmlFor="recurring" className="flex items-center gap-2 text-sm text-slate-400">
                <Repeat className="h-4 w-4 text-neon-blue" />
                Регулярное расписание (серия на месяц)
              </label>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  {recurring ? "Дата начала *" : "Дата *"}
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  min={todayIso}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Время начала *
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">
                Длительность (мин) *
              </label>
              <input
                type="number"
                min={30}
                max={180}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: parseInt(e.target.value, 10) || 90 })
                }
                className={`${INPUT_CLASS} max-w-[120px]`}
              />
            </div>

            {recurring && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-400">
                    Дни недели (0=Вс, 1=Пн, ... 6=Сб)
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                      const checked = form.weekdays.includes(d);
                      return (
                        <label
                          key={d}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? "border-neon-blue bg-neon-blue/20 text-neon-blue"
                              : "border-white/20 bg-white/5 text-slate-400 hover:border-white/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({
                                  ...form,
                                  weekdays: [...form.weekdays, d].sort((a, b) => a - b),
                                });
                              } else {
                                setForm({
                                  ...form,
                                  weekdays: form.weekdays.filter((x) => x !== d),
                                });
                              }
                            }}
                            className="sr-only"
                          />
                          {["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][d]}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400">
                    Количество недель
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.weeks}
                    onChange={(e) =>
                      setForm({ ...form, weeks: parseInt(e.target.value, 10) || 4 })
                    }
                    className={`${INPUT_CLASS} max-w-[100px]`}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400">Место</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={INPUT_CLASS}
                placeholder="Ледовая арена"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Заметки</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className={INPUT_CLASS}
                placeholder="Заметки к тренировке..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 bg-white/5 px-6 py-4 sm:flex-row sm:items-center">
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение…" : recurring ? "Создать серию тренировок" : "Сохранить тренировку"}
            </Button>
            <Link href="/trainings">
              <Button type="button" variant="secondary">
                Отмена
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

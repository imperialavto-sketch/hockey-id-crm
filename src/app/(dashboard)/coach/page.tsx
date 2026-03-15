"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Calendar, Plus, UserCircle } from "lucide-react";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface Attendance {
  id: string;
  player?: Player | null;
}

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  attendances?: Attendance[];
}

export default function CoachPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", durationMinutes: 60, price: 2000 });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTrainings = () => {
    fetch("/api/coach/trainings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) return data;
        return [];
      })
      .then(setTrainings)
      .catch(() => setTrainings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitLoading(true);

    try {
      const res = await fetch("/api/coach/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          durationMinutes: Number(form.durationMinutes),
          price: Number(form.price),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Ошибка создания");
        setSubmitLoading(false);
        return;
      }

      setForm({ title: "", durationMinutes: 60, price: 2000 });
      setFormOpen(false);
      setTrainings((prev) => [data, ...prev]);
    } catch {
      setError("Ошибка создания");
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDuration = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Math.round((e - s) / 60000);
  };

  const safeTrainings = Array.isArray(trainings) ? trainings : [];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ice-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Интерфейс тренера
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Мои занятия
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(!formOpen)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Добавить занятие
        </Button>
      </div>

      {formOpen && (
        <Card className="mb-8">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">
            Новое занятие
          </h2>
          <form onSubmit={handleAddTraining} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-400">
                Название *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-ice-500 focus:outline-none focus:ring-1 focus:ring-ice-500"
                placeholder="Индивидуальная тренировка"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Длительность (мин) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinutes: Number(e.target.value) || 60 })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white focus:border-ice-500 focus:outline-none focus:ring-1 focus:ring-ice-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) || 0 })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-white focus:border-ice-500 focus:outline-none focus:ring-1 focus:ring-ice-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? "Сохранение…" : "Добавить занятие"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      {safeTrainings.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <Calendar className="h-12 w-12 text-slate-500" />
            <p className="mt-4 text-slate-400">Занятия пока не добавлены</p>
            <p className="mt-1 text-sm text-slate-500">
              Нажмите «Добавить занятие», чтобы создать первое
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {safeTrainings.map((t) => {
            const duration = formatDuration(t.startTime, t.endTime);
            const players = t.attendances?.map((a) => a.player).filter(Boolean) ?? [];

            return (
              <Card key={t.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-ice-500/10 p-3">
                      <Calendar className="h-8 w-8 text-ice-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-white">
                        {t.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {t.startTime
                          ? new Date(t.startTime).toLocaleString("ru-RU")
                          : "—"}
                        {t.location ? ` • ${t.location}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {duration} мин
                        {t.notes ? ` • ${t.notes}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {players.length > 0 && (
                  <div className="mt-4 border-t border-slate-600/50 pt-4">
                    <h3 className="mb-2 text-sm font-medium text-slate-400">
                      Записавшиеся игроки
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {players.map((p) =>
                        p ? (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-sm text-slate-200"
                          >
                            <UserCircle className="h-4 w-4" />
                            {p.firstName} {p.lastName}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                )}

                {players.length === 0 && (
                  <p className="mt-4 border-t border-slate-600/50 pt-4 text-sm text-slate-500">
                    Нет записавшихся игроков
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

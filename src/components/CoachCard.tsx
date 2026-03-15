"use client";

import { useState, useEffect } from "react";
import { GraduationCap, Calendar, Plus, X, Users } from "lucide-react";
import { Button } from "@/components/Button";

interface CoachCardProps {
  id: string;
  firstName: string;
  lastName: string;
  specialization?: string | null;
  avatarUrl?: string | null;
  teamsCount?: number;
  trainingsCount?: number;
}

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  team?: { name: string } | null;
}

export function CoachCard({
  id,
  firstName,
  lastName,
  specialization,
  avatarUrl,
  teamsCount,
  trainingsCount,
}: CoachCardProps) {
  const [showTrainings, setShowTrainings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [trainingsLoading, setTrainingsLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    durationMinutes: 60,
    date: "",
    price: 2000,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");


  useEffect(() => {
    if (!showTrainings) return;
    setTrainingsLoading(true);
    fetch(`/api/coach/trainings?coachId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .then(setTrainings)
      .catch(() => setTrainings([]))
      .finally(() => setTrainingsLoading(false));
  }, [showTrainings, id]);

  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const startTime = form.date
        ? new Date(form.date).toISOString()
        : undefined;
      const res = await fetch("/api/coach/trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          durationMinutes: form.durationMinutes,
          price: form.price,
          coachId: id,
          startTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error ?? "Ошибка создания");
        return;
      }
      setForm({ title: "", durationMinutes: 60, date: "", price: 2000 });
      setShowAddForm(false);
      setTrainings((prev) => [data, ...prev]);
    } catch {
      setFormError("Ошибка сети");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (start: string, end: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Math.round((e - s) / 60000);
  };

  return (
    <>
      <div className="group overflow-hidden rounded-2xl glass-card transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,0,170,0.3)] hover:border-neon-pink/50 animate-fade-in min-w-0">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-neon-pink to-neon-purple shadow-[0_0_25px_rgba(255,0,170,0.4)]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${firstName} ${lastName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <GraduationCap className="h-10 w-10 text-white/95" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-bold tracking-wide text-white truncate">
                {firstName} {lastName}
              </h3>
              <p className="mt-0.5 text-sm text-slate-400 line-clamp-2">
                {specialization ?? "Тренер"}
              </p>
              {(teamsCount != null || trainingsCount != null) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {teamsCount != null && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {teamsCount} команд
                    </span>
                  )}
                  {trainingsCount != null && (
                    <span className="flex items-center gap-1 text-neon-cyan">
                      <Calendar className="h-3.5 w-3.5" />
                      {trainingsCount} занятий
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowTrainings(true)}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-neon-blue/10 hover:border-neon-blue/50 hover:text-white"
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="truncate">Посмотреть занятия</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-blue to-neon-cyan px-3 py-2.5 text-sm font-medium text-dark-900 transition-all hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Добавить занятие</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Занятия */}
      {showTrainings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="font-display text-lg font-semibold text-white truncate">
                Занятия — {firstName} {lastName}
              </h2>
              <button
                onClick={() => setShowTrainings(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              {trainingsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
                </div>
              ) : trainings.length === 0 ? (
                <p className="text-center text-slate-500 py-12">Занятий пока нет</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-slate-500">
                        <th className="py-3 pr-4">Название</th>
                        <th className="py-3 pr-4">Дата</th>
                        <th className="py-3 pr-4">Длительность</th>
                        <th className="py-3">Локация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainings.map((t) => (
                        <tr key={t.id} className="border-b border-white/5">
                          <td className="py-3 pr-4 font-medium text-white truncate max-w-[180px]">
                            {t.title}
                          </td>
                          <td className="py-3 pr-4 text-slate-400">
                            {new Date(t.startTime).toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 pr-4 text-slate-400">
                            {formatDuration(t.startTime, t.endTime)} мин
                          </td>
                          <td className="py-3 text-slate-400 truncate max-w-[120px]">
                            {t.location ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Добавить занятие */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-semibold text-white">
                Новое занятие
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormError("");
                }}
                className="p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddTraining} className="space-y-4">
              {formError && (
                <p className="rounded-xl bg-neon-pink/10 border border-neon-pink/30 px-4 py-2 text-sm text-neon-pink">
                  {formError}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Индивидуальная тренировка"
                  required
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Длительность (мин) *
                </label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinutes: Number(e.target.value) || 60 })
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Дата и время
                </label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 justify-center"
                >
                  {submitting ? "Сохранение…" : "Добавить"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormError("");
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

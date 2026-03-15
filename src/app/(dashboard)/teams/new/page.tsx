"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

interface School {
  id: string;
  name: string;
}

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
}

export default function NewTeamPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    ageGroup: "",
    schoolId: "",
    coachId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/schools").then((r) => r.json()).catch(() => []),
      fetch("/api/coaches").then((r) => r.json()).catch(() => []),
    ]).then(([schoolsData, coachesData]) => {
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      setCoaches(Array.isArray(coachesData) ? coachesData : []);
    });
  }, []);

  const safeSchools = Array.isArray(schools) ? schools : [];
  const safeCoaches = Array.isArray(coaches) ? coaches : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          ageGroup: form.ageGroup,
          schoolId: form.schoolId || undefined,
          coachId: form.coachId || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Ошибка сохранения");
        setLoading(false);
        return;
      }

      router.push(`/teams/${data.id}`);
    } catch {
      setError("Ошибка сохранения");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/teams"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Добавить команду
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Создание новой команды
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(0,212,255,0.08)]">
          <div className="space-y-6 p-6 sm:p-8">
            {error && (
              <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                Школа *
              </label>
              <select
                value={form.schoolId}
                onChange={(e) =>
                  setForm({ ...form, schoolId: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                required
              >
                <option value="">Выберите школу</option>
                {safeSchools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                  Название команды *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 focus:border-ice-500 focus:outline-none focus:ring-1 focus:ring-ice-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Например: Медвежата U12"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                  Возрастная группа *
                </label>
                <input
                  type="text"
                  value={form.ageGroup}
                  onChange={(e) =>
                    setForm({ ...form, ageGroup: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 focus:border-ice-500 focus:outline-none focus:ring-1 focus:ring-ice-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="U12, U14, ..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                Тренер
              </label>
              <select
                value={form.coachId}
                onChange={(e) =>
                  setForm({ ...form, coachId: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
              >
                <option value="">Тренер не назначен</option>
                {safeCoaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 bg-white/5 px-6 py-4 sm:flex-row sm:items-center">
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение…" : "Сохранить команду"}
            </Button>
            <Link href="/teams">
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

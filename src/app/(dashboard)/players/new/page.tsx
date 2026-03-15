"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

type Position = "Вратарь" | "Защитник" | "Нападающий";
type Grip = "Левый" | "Правый";
type Status = "Активен" | "На паузе" | "Травма";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
}

export default function NewPlayerPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthYear: "",
    birthDate: "",
    position: "Нападающий" as Position | "",
    grip: "Левый" as Grip | "",
    height: "" as string,
    weight: "" as string,
    city: "",
    country: "Россия",
    teamId: "" as string,
    status: "Активен" as Status,
    coachComment: "",
  });

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
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          birthYear: parseInt(String(form.birthYear), 10),
          birthDate: form.birthDate || null,
          position: form.position,
          grip: form.grip,
          height: form.height ? Number(form.height) : null,
          weight: form.weight ? Number(form.weight) : null,
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          teamId: form.teamId?.trim() || null,
          status: form.status,
          comment: form.coachComment?.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error ?? "Ошибка создания игрока";
        const details = data?.details;
        setError(details ? `${msg}: ${details}` : msg);
        setLoading(false);
        return;
      }

      const playerId = data?.id;
      router.push(playerId ? `/players/${playerId}` : "/players");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка создания игрока"
      );
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/players"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Добавить игрока
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Создание карточки нового хоккеиста
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
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Имя
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  placeholder="Имя"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Фамилия
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  placeholder="Фамилия"
                  required
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400">Год рождения *</label>
                <input
                  type="number"
                  min={1990}
                  max={2025}
                  value={form.birthYear}
                  onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                  className="mt-1.5 w-full max-w-[160px] rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  placeholder="2010"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">Дата рождения</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Амплуа
                </label>
                <select
                  value={form.position}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      position: e.target.value as Position,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  required
                >
                  <option value="">Выберите амплуа</option>
                  <option value="Вратарь">Вратарь</option>
                  <option value="Защитник">Защитник</option>
                  <option value="Нападающий">Нападающий</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Хват
                </label>
                <select
                  value={form.grip}
                  onChange={(e) =>
                    setForm({ ...form, grip: e.target.value as Grip })
                  }
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  required
                >
                  <option value="">Выберите хват</option>
                  <option value="Левый">Левый</option>
                  <option value="Правый">Правый</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400">Рост (см)</label>
                <input
                  type="number"
                  min={80}
                  max={250}
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  placeholder="150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">Вес (кг)</label>
                <input
                  type="number"
                  min={20}
                  max={150}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  placeholder="45"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-400">Город</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  placeholder="Казань"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">Страна</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                  placeholder="Россия"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">Команда</label>
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-ice-500 focus:outline-none focus:ring-1 focus:ring-ice-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Без команды</option>
                {safeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.ageGroup})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">
                Статус
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Status })
                }
                className="mt-1.5 w-full max-w-[200px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-ice-500 focus:outline-none focus:ring-1 focus:ring-ice-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="Активен">Активен</option>
                <option value="На паузе">На паузе</option>
                <option value="Травма">Травма</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400">
                Комментарий тренера
              </label>
              <textarea
                value={form.coachComment}
                onChange={(e) =>
                  setForm({ ...form, coachComment: e.target.value })
                }
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
                placeholder="Заметки о игроке..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 bg-white/5 px-6 py-4 sm:flex-row sm:items-center">
            <Button type="submit" disabled={loading}>
              {loading ? "Сохранение…" : "Сохранить игрока"}
            </Button>
            <Link href="/players">
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

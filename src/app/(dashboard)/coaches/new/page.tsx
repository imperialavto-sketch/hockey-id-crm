"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
}

export default function NewCoachPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    specialization: "",
    teamIds: [] as string[],
  });

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams(Array.isArray(d) ? d : d?.teams ?? []))
      .catch(() => setTeams([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          specialization: form.specialization.trim() || null,
          teamIds: form.teamIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Ошибка сохранения");
        setLoading(false);
        return;
      }

      router.push(`/coaches/${data.id}`);
    } catch {
      setError("Ошибка сохранения");
      setLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setForm((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((x) => x !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/coaches"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к тренерам
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Добавить тренера</h1>
        <p className="mt-1 text-sm text-slate-400">Создание карточки тренера</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        {error && (
          <div className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-neon-pink">{error}</div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Имя *</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
              placeholder="Алексей"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">Фамилия *</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
              placeholder="Ковалёв"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            placeholder="coach@hockey-kazan.ru"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Телефон</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            placeholder="+7 (999) 123-45-67"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Специализация</label>
          <input
            type="text"
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            placeholder="Нападающие, техническая подготовка"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Команды</label>
          <div className="flex flex-wrap gap-2">
            {teams.map((t) => (
              <label
                key={t.id}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-sm transition-colors ${
                  form.teamIds.includes(t.id)
                    ? "border-neon-blue bg-neon-blue/20 text-neon-blue"
                    : "border-white/20 bg-white/5 text-slate-400 hover:border-white/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.teamIds.includes(t.id)}
                  onChange={() => toggleTeam(t.id)}
                  className="sr-only"
                />
                {t.name}
              </label>
            ))}
          </div>
          {teams.length === 0 && <p className="text-sm text-slate-500">Нет доступных команд</p>}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Сохранение…" : "Сохранить тренера"}
          </Button>
          <Link href="/coaches">
            <Button type="button" variant="secondary">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

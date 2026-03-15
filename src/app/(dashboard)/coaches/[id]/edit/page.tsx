"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
}

export default function EditCoachPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    if (!id) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/coaches/${id}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([coach, teamsData]) => {
        if (coach?.error || !coach?.id) {
          router.push("/coaches");
          return;
        }
        setForm({
          firstName: coach.firstName ?? "",
          lastName: coach.lastName ?? "",
          phone: coach.phone ?? "",
          email: coach.email ?? "",
          specialization: coach.specialization ?? "",
          teamIds: (coach.teams ?? []).map((t: { id: string }) => t.id),
        });
        setTeams(Array.isArray(teamsData) ? teamsData : teamsData?.teams ?? []);
      })
      .catch(() => router.push("/coaches"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/coaches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || null,
          email: form.email || null,
          specialization: form.specialization || null,
          teamIds: form.teamIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Ошибка сохранения");
        setSaving(false);
        return;
      }
      router.push(`/coaches/${id}`);
    } catch {
      setError("Ошибка сохранения");
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <Link
        href={`/coaches/${id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к тренеру
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Редактировать тренера</h1>
        <p className="mt-1 text-sm text-slate-400">Профиль, специализация, команды</p>
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
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Телефон</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">Специализация</label>
          <input
            type="text"
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            placeholder="Нападающие, вратари, тактика"
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
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          <Link href={`/coaches/${id}`}>
            <Button type="button" variant="secondary">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

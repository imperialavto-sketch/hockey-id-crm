"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
}

export default function TeamEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    ageGroup: "",
    coachId: "",
  });
  const [coaches, setCoaches] = useState<Coach[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/teams/${id}`).then((r) => r.json()),
      fetch("/api/coaches").then((r) => r.json()),
    ])
      .then(([team, coachesData]) => {
        if (team?.id) {
          setForm({
            name: team.name ?? "",
            ageGroup: team.ageGroup ?? "",
            coachId: team.coach?.id ?? "",
          });
        }
        const c = Array.isArray(coachesData) ? coachesData : coachesData?.data ?? [];
        setCoaches(c);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) router.push(`/teams/${id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <Link
        href={`/teams/${id}`}
        className="mb-6 inline-flex items-center text-sm text-slate-400 hover:text-neon-blue"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к команде
      </Link>
      <h1 className="font-display text-2xl font-bold text-white mb-6">
        Редактирование команды
      </h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Название</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Возрастная группа</label>
          <input
            type="text"
            value={form.ageGroup}
            onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Главный тренер</label>
          <select
            value={form.coachId}
            onChange={(e) => setForm({ ...form, coachId: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white"
          >
            <option value="">Не назначен</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          <Link href={`/teams/${id}`}>
            <Button type="button" variant="secondary">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

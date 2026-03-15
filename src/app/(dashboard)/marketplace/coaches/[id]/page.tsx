"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";

const SPECIALTY_OPTIONS = [
  "Катание",
  "Бросок",
  "Дриблинг",
  "Вратари",
  "ОФП",
  "Подкатка",
  "Индивидуальная тренировка",
  "Баланс",
  "Скорость",
];

const FORMAT_OPTIONS = [
  { value: "individual", label: "Индивидуально" },
  { value: "group", label: "Группы" },
  { value: "online", label: "Онлайн" },
  { value: "offline", label: "Оффлайн" },
];

export default function MarketplaceCoachEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    city: "",
    bio: "",
    specialties: [] as string[],
    experienceYears: 0,
    priceFrom: 0,
    rating: "" as number | "",
    trainingFormats: [] as string[],
    isPublished: false,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/admin/marketplace/coaches/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          fullName: data.fullName ?? "",
          city: data.city ?? "",
          bio: data.bio ?? "",
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          experienceYears: data.experienceYears ?? 0,
          priceFrom: data.priceFrom ?? 0,
          rating: data.rating != null ? data.rating : "",
          trainingFormats: Array.isArray(data.trainingFormats)
            ? data.trainingFormats
            : [],
          isPublished: Boolean(data.isPublished),
        });
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleSpecialty = (s: string) => {
    setForm((f) => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter((x) => x !== s)
        : [...f.specialties, s],
    }));
  };

  const toggleFormat = (v: string) => {
    setForm((f) => ({
      ...f,
      trainingFormats: f.trainingFormats.includes(v)
        ? f.trainingFormats.filter((x) => x !== v)
        : [...f.trainingFormats, v],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketplace/coaches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          city: form.city.trim(),
          bio: form.bio.trim() || null,
          specialties: form.specialties,
          experienceYears: Number(form.experienceYears) || 0,
          priceFrom: Number(form.priceFrom) || 0,
          rating: form.rating !== "" ? Number(form.rating) : null,
          trainingFormats: form.trainingFormats,
          isPublished: form.isPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Ошибка сохранения");
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Ошибка сохранения");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (error && !form.fullName) {
    return (
      <div className="p-6">
        <p className="text-neon-pink">{error}</p>
        <Link href="/marketplace" className="mt-4 inline-block text-neon-blue">
          ← Назад к маркетплейсу
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/marketplace"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к маркетплейсу
      </Link>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Редактировать тренера
        </h1>
        <p className="mt-1 text-sm text-slate-400">{form.fullName}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="rounded-xl border border-neon-pink/40 bg-neon-pink/10 px-4 py-3 text-neon-pink">
            {error}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">
            Имя и фамилия *
          </label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">
            Город *
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">
            О тренере
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            rows={3}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">
            Специализации
          </label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  form.specialties.includes(s)
                    ? "bg-neon-blue text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Опыт (лет)
            </label>
            <input
              type="number"
              min={0}
              value={form.experienceYears || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  experienceYears: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Цена от (₽)
            </label>
            <input
              type="number"
              min={0}
              value={form.priceFrom || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  priceFrom: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">
            Рейтинг
          </label>
          <input
            type="number"
            step={0.1}
            min={0}
            max={5}
            value={form.rating}
            onChange={(e) =>
              setForm({
                ...form,
                rating: e.target.value === "" ? "" : parseFloat(e.target.value),
              })
            }
            className="w-24 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-400">
            Форматы занятий
          </label>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleFormat(o.value)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  form.trainingFormats.includes(o.value)
                    ? "bg-neon-blue text-white"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="published"
            checked={form.isPublished}
            onChange={(e) =>
              setForm({ ...form, isPublished: e.target.checked })
            }
            className="h-4 w-4 rounded border-white/20"
          />
          <label htmlFor="published" className="text-sm text-slate-400">
            Опубликовать (виден родителям)
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
          <Link href="/marketplace">
            <Button type="button" variant="secondary">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

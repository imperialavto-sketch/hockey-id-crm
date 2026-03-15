"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

interface ProfileFormProps {
  playerId: string;
  initial?: {
    height?: number | null;
    weight?: number | null;
    jerseyNumber?: number | null;
    shoots?: string | null;
  } | null;
}

export function ProfileForm({ playerId, initial }: ProfileFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    height: initial?.height ?? "",
    weight: initial?.weight ?? "",
    jerseyNumber: initial?.jerseyNumber ?? "",
    shoots: initial?.shoots ?? "",
  });

  useEffect(() => {
    setForm({
      height: initial?.height ?? "",
      weight: initial?.weight ?? "",
      jerseyNumber: initial?.jerseyNumber ?? "",
      shoots: initial?.shoots ?? "",
    });
  }, [initial?.height, initial?.weight, initial?.jerseyNumber, initial?.shoots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: form.height === "" ? null : Number(form.height),
          weight: form.weight === "" ? null : Number(form.weight),
          jerseyNumber:
            form.jerseyNumber === "" ? null : Number(form.jerseyNumber),
          shoots: form.shoots || null,
        }),
      });
      if (res.ok) {
        router.refresh();
        setOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data?.error as string) ?? "Ошибка сохранения");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm text-ice-400 hover:text-ice-300"
      >
        {initial ? "Обновить данные" : "Заполнить данные"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      {error && (
        <p className="rounded bg-red-500/10 px-2 py-1.5 text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-slate-500">Рост (см)</label>
          <input
            type="number"
            value={form.height}
            onChange={(e) =>
              setForm({ ...form, height: e.target.value })
            }
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Вес (кг)</label>
          <input
            type="number"
            value={form.weight}
            onChange={(e) =>
              setForm({ ...form, weight: e.target.value })
            }
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Номер</label>
          <input
            type="number"
            value={form.jerseyNumber}
            onChange={(e) =>
              setForm({ ...form, jerseyNumber: e.target.value })
            }
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Хват / Shoots</label>
          <input
            type="text"
            value={form.shoots}
            onChange={(e) =>
              setForm({ ...form, shoots: e.target.value })
            }
            placeholder="Левый / Правый"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Сохранение…" : "Сохранить профиль"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

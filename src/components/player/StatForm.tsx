"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

interface StatFormProps {
  playerId: string;
}

export function StatForm({ playerId }: StatFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth();
    const s =
      m >= 6 ? `${y}-${String((y + 1) % 100).padStart(2, "0")}` : `${y - 1}-${String(y % 100).padStart(2, "0")}`;
    return {
    season: s,
    games: 0,
    goals: 0,
    assists: 0,
    pim: 0,
  };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        + Добавить статистику
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
      <div>
        <label className="block text-xs text-slate-500">Сезон</label>
        <input
          type="text"
          value={form.season}
          onChange={(e) =>
            setForm({ ...form, season: e.target.value })
          }
          placeholder="2024-25"
          className="mt-1 w-full max-w-[120px] rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <label className="block text-xs text-slate-500">Игры</label>
          <input
            type="number"
            min={0}
            value={form.games}
            onChange={(e) =>
              setForm({ ...form, games: parseInt(e.target.value, 10) || 0 })
            }
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Голы</label>
          <input
            type="number"
            min={0}
            value={form.goals}
            onChange={(e) =>
              setForm({ ...form, goals: parseInt(e.target.value, 10) || 0 })
            }
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Передачи</label>
          <input
            type="number"
            min={0}
            value={form.assists}
            onChange={(e) =>
              setForm({ ...form, assists: parseInt(e.target.value, 10) || 0 })
            }
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500">Штраф (мин)</label>
          <input
            type="number"
            min={0}
            value={form.pim}
            onChange={(e) =>
              setForm({ ...form, pim: parseInt(e.target.value, 10) || 0 })
            }
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Сохранение…" : "Добавить статистику"}
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

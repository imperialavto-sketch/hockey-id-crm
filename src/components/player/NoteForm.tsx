"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

interface NoteFormProps {
  playerId: string;
}

export function NoteForm({ playerId }: NoteFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (res.ok) {
        router.refresh();
        setNote("");
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
        + Добавить заметку
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {error && (
        <p className="mb-2 rounded bg-red-500/10 px-2 py-1.5 text-sm text-red-400">
          {error}
        </p>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Комментарий / заметка"
        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        required
      />
      <div className="mt-2 flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !note.trim()}>
          {loading ? "Сохранение…" : "Добавить комментарий"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpen(false);
            setNote("");
            setError("");
          }}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

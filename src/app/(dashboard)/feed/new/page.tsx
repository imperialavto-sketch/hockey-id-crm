"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const TYPES = [
  { value: "announcement", label: "Объявление" },
  { value: "news", label: "Новость" },
  { value: "schedule_update", label: "Расписание" },
  { value: "match_day", label: "Матч" },
  { value: "photo_post", label: "Фото" },
];

export default function NewFeedPostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState("");
  const [type, setType] = useState("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teams", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTeams(list.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
        if (list.length > 0 && !teamId) setTeamId(list[0].id);
      })
      .catch(() => setTeams([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !title.trim() || !body.trim()) {
      setError("Заполните команду, заголовок и текст");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          teamId,
          type,
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          isPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Ошибка создания");
        return;
      }
      router.push("/feed");
    } catch {
      setError("Ошибка сети");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/feed"
          className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <h1 className="font-display text-2xl font-bold text-white">Новая публикация</h1>
      </div>

      <Card className="border-neon-blue/20 bg-white/5">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Команда
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-neon-blue focus:outline-none"
              required
            >
              <option value="">Выберите команду</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Тип
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-neon-blue focus:outline-none"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Заголовок
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Текст
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Текст публикации"
              rows={5}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              URL изображения (необязательно)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-neon-blue focus:ring-neon-blue"
            />
            <label htmlFor="pinned" className="text-sm text-slate-400">
              Закрепить в ленте
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" disabled={sending} className="gap-2">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Опубликовать
          </Button>
        </form>
      </Card>
    </div>
  );
}

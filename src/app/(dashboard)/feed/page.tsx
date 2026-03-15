"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Newspaper,
  Loader2,
  Plus,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";

interface FeedPost {
  id: string;
  teamId: string;
  teamName?: string;
  authorName: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  announcement: "Объявление",
  news: "Новость",
  schedule_update: "Расписание",
  match_day: "Матч",
  photo_post: "Фото",
};

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/feed", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const togglePin = async (id: string, isPinned: boolean) => {
    try {
      const res = await fetch(`/api/feed/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPinned: !isPinned }),
      });
      if (res.ok) load();
    } catch {
      // ignore
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Удалить публикацию?")) return;
    try {
      const res = await fetch(`/api/feed/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) load();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-neon-blue/20 p-2 border border-neon-blue/40">
            <Newspaper className="h-6 w-6 text-neon-blue" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Лента</h1>
            <p className="text-sm text-slate-400">Публикации команд</p>
          </div>
        </div>
        <Link href="/feed/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Создать
          </Button>
        </Link>
      </div>

      <Card className="border-neon-blue/20 bg-white/5">
        {posts.length === 0 ? (
          <p className="py-12 text-center text-slate-500">
            Публикаций пока нет. Создайте первую запись.
          </p>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-neon-blue/20 px-2 py-0.5 text-xs font-medium text-neon-blue">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                    {p.isPinned && (
                      <Pin className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span className="text-xs text-slate-500">
                      {p.teamName}
                    </span>
                  </div>
                  <h3 className="font-medium text-white">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {p.body}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {p.authorName} ·{" "}
                    {new Date(p.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => togglePin(p.id, p.isPinned)}
                    className="rounded p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                    title={p.isPinned ? "Открепить" : "Закрепить"}
                  >
                    {p.isPinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </button>
                  <Link href={`/feed/${p.id}/edit`}>
                    <span className="inline-flex rounded p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </span>
                  </Link>
                  <button
                    onClick={() => deletePost(p.id)}
                    className="rounded p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Loader2, ChevronRight } from "lucide-react";
import { Card } from "@/components/Card";

interface ConversationItem {
  id: string;
  playerId: string;
  playerName: string;
  coachId: string;
  coachName: string;
  parentId: string;
  parentName?: string;
  lastMessage?: string;
  updatedAt: string;
}

export default function CommunicationsPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/chat/conversations", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setConversations(Array.isArray(data) ? data : []);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? conversations.filter(
        (c) =>
          c.playerName.toLowerCase().includes(filter.toLowerCase()) ||
          (c.parentName ?? "").toLowerCase().includes(filter.toLowerCase())
      )
    : conversations;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-neon-blue/20 p-2 border border-neon-blue/40">
          <MessageSquare className="h-6 w-6 text-neon-blue" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Сообщения
          </h1>
          <p className="text-sm text-slate-400">
            Чаты с родителями игроков
          </p>
        </div>
      </div>

      <Card className="border-neon-blue/20 bg-white/5">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по игроку или родителю..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full max-w-md rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-slate-500">
              {conversations.length === 0
                ? "Чатов пока нет. Родители создают чаты из приложения."
                : "Нет совпадений по фильтру"}
            </p>
          ) : (
            filtered.map((c) => (
              <Link
                key={c.id}
                href={`/communications/chat/${c.id}`}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10 hover:border-neon-blue/30"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neon-blue/20">
                  <MessageSquare className="h-6 w-6 text-neon-blue" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    {c.parentName ?? "Родитель"} ↔ {c.playerName}
                  </p>
                  {c.lastMessage && (
                    <p className="mt-1 truncate text-sm text-slate-400">
                      {c.lastMessage}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(c.updatedAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

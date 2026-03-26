"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Loader2, ChevronRight } from "lucide-react";
import { Card } from "@/components/Card";
import { CRM_ACTIONS_COPY } from "@/lib/crmActionsCopy";

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
  const [fetchError, setFetchError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    fetch("/api/chat/conversations", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error("fetch failed");
        return Array.isArray(data) ? data : [];
      })
      .then((list) => {
        setConversations(list);
        setFetchError(false);
      })
      .catch(() => {
        setConversations([]);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [loadTick]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return conversations;
    const q = filter.toLowerCase();
    return conversations.filter(
      (c) =>
        c.playerName.toLowerCase().includes(q) ||
        (c.parentName ?? "").toLowerCase().includes(q)
    );
  }, [conversations, filter]);

  const summary = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const recent = conversations.filter((c) => now - new Date(c.updatedAt).getTime() <= dayMs).length;
    const withMessages = conversations.filter((c) => Boolean(c.lastMessage)).length;
    const withoutMessages = conversations.length - withMessages;
    return { recent, withMessages, withoutMessages };
  }, [conversations]);

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.08]">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_ACTIONS_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_ACTIONS_COPY.loadingHint}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div
            className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="alert"
          >
            <div>
              <p className="font-medium text-amber-100">{CRM_ACTIONS_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_ACTIONS_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setLoadTick((x) => x + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_ACTIONS_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
              {CRM_ACTIONS_COPY.navDashboard}
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
                {CRM_ACTIONS_COPY.heroEyebrow}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {CRM_ACTIONS_COPY.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {CRM_ACTIONS_COPY.heroSubtitle}
              </p>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_ACTIONS_COPY.filtersKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_ACTIONS_COPY.filtersTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ACTIONS_COPY.filtersHint}</p>
          </div>
          <div className="p-4 sm:p-5">
            <input
              type="text"
              placeholder={CRM_ACTIONS_COPY.searchPlaceholder}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-white/20 focus:outline-none"
            />
          </div>
        </Card>

        <Card className="rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_ACTIONS_COPY.summaryKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_ACTIONS_COPY.summaryTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ACTIONS_COPY.summaryHint}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_ACTIONS_COPY.statTotal}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{conversations.length}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_ACTIONS_COPY.statRecent}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.recent}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_ACTIONS_COPY.statWithMessages}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.withMessages}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{CRM_ACTIONS_COPY.statWithoutMessages}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summary.withoutMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0 hover:border-white/[0.12]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {CRM_ACTIONS_COPY.listKicker}
            </p>
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              {CRM_ACTIONS_COPY.listTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_ACTIONS_COPY.listHint}</p>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-14 text-center sm:px-6">
              <MessageSquare className="mx-auto h-11 w-11 text-slate-600" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-400">
                {conversations.length === 0 ? CRM_ACTIONS_COPY.emptyTitle : CRM_ACTIONS_COPY.emptyFilteredTitle}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-600">
                {conversations.length === 0 ? CRM_ACTIONS_COPY.emptyHint : CRM_ACTIONS_COPY.emptyFilteredHint}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  href={`/communications/chat/${c.id}`}
                  className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.03] sm:px-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-500">
                    <MessageSquare className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">
                      {c.parentName ?? "Родитель"} ↔ {c.playerName}
                    </p>
                    {c.lastMessage ? (
                      <p className="mt-1 truncate text-sm text-slate-400">{c.lastMessage}</p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-600">Сообщений пока нет</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(c.updatedAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 opacity-40 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

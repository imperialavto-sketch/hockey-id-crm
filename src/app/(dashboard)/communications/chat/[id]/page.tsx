"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, ChevronRight } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CRM_COMMUNICATIONS_DETAIL_COPY } from "@/lib/crmCommunicationsDetailCopy";

interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: "parent" | "coach";
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string | null;
}

interface ConversationMeta {
  id: string;
  parentName?: string | null;
  playerName?: string | null;
  unreadCount?: number;
}

export default function ChatConversationPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setFetchError(false);
    setNotFound(false);

    Promise.all([
      fetch(`/api/chat/conversations/${id}`, { credentials: "include" }).then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error("fetch failed");
        return data;
      }),
      fetch(`/api/chat/conversations/${id}/messages`, { credentials: "include" }).then(async (r) => {
        const data = await r.json().catch(() => []);
        if (!r.ok) throw new Error("fetch failed");
        return Array.isArray(data) ? data : [];
      }),
    ])
      .then(([conversation, thread]) => {
        if (!conversation?.id) {
          setNotFound(true);
          setMeta(null);
          setMessages([]);
          return;
        }
        setMeta(conversation);
        setMessages(thread);
        setFetchError(false);
      })
      .catch(() => {
        setFetchError(true);
        setMeta(null);
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !id || sending) return;

    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setMessages((prev) => [...prev, data]);
      } else {
        setInput(text);
      }
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const title = meta?.parentName && meta?.playerName
    ? `${meta.parentName} ↔ ${meta.playerName}`
    : CRM_COMMUNICATIONS_DETAIL_COPY.heroTitleFallback;

  const lastMessage = useMemo(() => {
    if (messages.length === 0) return null;
    return messages.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [messages]);

  const unreadCount = meta?.unreadCount ?? messages.filter((m) => m.senderType === "parent" && !m.readAt).length;

  if (loading) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <Card className="rounded-2xl border-white/[0.08] p-0">
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-10 w-10 animate-spin text-neon-blue" aria-hidden />
              <div className="text-center">
                <p className="font-display text-base font-semibold text-white">{CRM_COMMUNICATIONS_DETAIL_COPY.loadingTitle}</p>
                <p className="mt-1 text-sm text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.loadingHint}</p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/communications" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_COMMUNICATIONS_DETAIL_COPY.navCommunications}
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue">
              {CRM_COMMUNICATIONS_DETAIL_COPY.navDashboard}
            </Link>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="alert">
            <div>
              <p className="font-medium text-amber-100">{CRM_COMMUNICATIONS_DETAIL_COPY.errorTitle}</p>
              <p className="mt-0.5 text-sm text-amber-200/80">{CRM_COMMUNICATIONS_DETAIL_COPY.errorHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="shrink-0 rounded-xl border border-amber-400/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              {CRM_COMMUNICATIONS_DETAIL_COPY.retryCta}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="overflow-x-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/communications" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_COMMUNICATIONS_DETAIL_COPY.navCommunications}
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue">
              {CRM_COMMUNICATIONS_DETAIL_COPY.navDashboard}
            </Link>
          </div>
          <div className="mx-auto max-w-2xl">
            <Card className="border-white/[0.08] p-8 text-center">
              <p className="font-display text-lg font-semibold text-white">{CRM_COMMUNICATIONS_DETAIL_COPY.notFoundTitle}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.notFoundHint}</p>
            </Card>
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
            <Link href="/communications" className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {CRM_COMMUNICATIONS_DETAIL_COPY.navCommunications}
            </Link>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 transition-colors hover:text-neon-blue">
              {CRM_COMMUNICATIONS_DETAIL_COPY.navDashboard}
            </Link>
          </div>

          <Card className="rounded-2xl border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-transparent p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neon-blue/90">
              {CRM_COMMUNICATIONS_DETAIL_COPY.heroEyebrow}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">{CRM_COMMUNICATIONS_DETAIL_COPY.heroSubtitle}</p>
            {meta?.playerName ? (
              <p className="mt-3 text-sm text-slate-500">
                {CRM_COMMUNICATIONS_DETAIL_COPY.statPlayer}: {meta.playerName}
              </p>
            ) : null}
          </Card>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.summaryKicker}</p>
            <h2 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">{CRM_COMMUNICATIONS_DETAIL_COPY.summaryTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_COMMUNICATIONS_DETAIL_COPY.summaryHint}</p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.statParticipants}</p>
              <p className="mt-1 text-sm font-medium text-white">
                {(meta?.parentName || CRM_COMMUNICATIONS_DETAIL_COPY.parentLabel)} / {CRM_COMMUNICATIONS_DETAIL_COPY.coachLabel}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.statPlayer}</p>
              <p className="mt-1 text-sm font-medium text-white">{meta?.playerName ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.statLastMessage}</p>
              <p className="mt-1 text-sm font-medium text-white">
                {lastMessage ? new Date(lastMessage.createdAt).toLocaleString("ru-RU") : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-xs text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.statUnread}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-white">{unreadCount}</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-white/[0.08] p-0">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.threadKicker}</p>
            <h2 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">{CRM_COMMUNICATIONS_DETAIL_COPY.threadTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_COMMUNICATIONS_DETAIL_COPY.threadHint}</p>
          </div>

          <div className="max-h-[55vh] space-y-4 overflow-y-auto p-5 sm:p-6">
            {messages.length === 0 ? (
              <p className="py-12 text-center text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.emptyThread}</p>
            ) : (
              messages.map((m) => {
                const isCoach = m.senderType === "coach";
                return (
                  <div key={m.id} className={`flex ${isCoach ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl border px-4 py-2 ${
                        isCoach
                          ? "rounded-bl-sm border-white/[0.08] bg-white/[0.05]"
                          : "rounded-br-sm border-white/15 bg-white/[0.1]"
                      }`}
                    >
                      <p className="mb-1 text-sm font-medium text-slate-400">
                        {isCoach ? CRM_COMMUNICATIONS_DETAIL_COPY.coachLabel : CRM_COMMUNICATIONS_DETAIL_COPY.parentLabel}
                      </p>
                      <p className="text-white">{m.text}</p>
                      <p className="mt-1 text-xs text-slate-500">{new Date(m.createdAt).toLocaleString("ru-RU")}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{CRM_COMMUNICATIONS_DETAIL_COPY.composerKicker}</p>
            <h3 className="mt-0.5 font-display text-base font-semibold tracking-tight text-white sm:text-lg">{CRM_COMMUNICATIONS_DETAIL_COPY.composerTitle}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{CRM_COMMUNICATIONS_DETAIL_COPY.composerHint}</p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder={CRM_COMMUNICATIONS_DETAIL_COPY.inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white placeholder-slate-500 focus:border-white/20 focus:outline-none"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={!input.trim() || sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {CRM_COMMUNICATIONS_DETAIL_COPY.sendCta}
              </Button>
              <Link href="/communications" className="inline-flex items-center gap-1 px-2 text-sm text-slate-500 transition-colors hover:text-neon-blue">
                {CRM_COMMUNICATIONS_DETAIL_COPY.navCommunications}
                <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

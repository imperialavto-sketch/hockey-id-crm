"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: "parent" | "coach";
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string | null;
}

export default function ChatConversationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("Чат");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/chat/conversations/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.playerName && data?.parentName) {
          setTitle(`${data.parentName} ↔ ${data.playerName}`);
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/chat/conversations/${id}/messages`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [id]);

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
      const data = await res.json();
      if (res.ok && data) {
        setMessages((prev) => [...prev, data]);
      }
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col p-6">
      <div className="mb-4 flex items-center gap-4">
        <Link
          href="/communications"
          className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <h1 className="font-display text-xl font-bold text-white">{title}</h1>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden border-neon-blue/20 bg-white/5">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="py-12 text-center text-slate-500">
                  Сообщений пока нет
                </p>
              ) : (
                messages.map((m) => {
                  const isCoach = m.senderType === "coach";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isCoach ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isCoach
                            ? "bg-white/10 border border-white/10 rounded-bl-sm"
                            : "bg-neon-blue/20 border border-neon-blue/30 rounded-br-sm"
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-400 mb-1">
                          {isCoach ? "Тренер" : "Родитель"}
                        </p>
                        <p className="text-white">{m.text}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(m.createdAt).toLocaleString("ru-RU")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 border-t border-white/10 p-4">
              <input
                type="text"
                placeholder="Сообщение"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="gap-2"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Отправить
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

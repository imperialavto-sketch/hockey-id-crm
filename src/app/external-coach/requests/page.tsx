"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogOut } from "lucide-react";

type RequestRow = {
  id: string;
  playerLabel: string;
  focusSummary: string;
  status: string;
  latestReportExists: boolean;
  arenaTask: { title: string; summary: string; checklist: string[] };
};

export default function ExternalCoachRequestsPage() {
  const { logout } = useAuth();
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/external-coach/requests", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Не удалось загрузить");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Ошибка сети");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Arena · внешний тренер
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-white">
            Задачи Arena
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Компактные поручения от Arena: бриф, фокус и фиксация результата без доступа к данным школы.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-400 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      ) : null}

      {rows === null ? (
        <div className="flex items-center gap-3 py-16 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Загрузка…
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-slate-500">Нет активных задач</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/external-coach/requests/${r.id}`}
                className="block rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:border-cyan-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-white">{r.playerLabel}</span>
                    <p className="mt-1 line-clamp-1 text-xs text-cyan-500/70">
                      {r.arenaTask.title}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      r.latestReportExists
                        ? "bg-slate-600/40 text-slate-300"
                        : "bg-amber-500/20 text-amber-200"
                    }`}
                  >
                    {r.latestReportExists ? "Результат сохранён" : "Нужен результат"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{r.focusSummary}</p>
                <p className="mt-2 line-clamp-1 text-xs text-slate-600">{r.status}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

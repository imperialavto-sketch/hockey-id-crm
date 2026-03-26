"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/Card";
import { normalizeWeekStartDateParam } from "@/lib/schedule-week";

const SELECT_CLASS =
  "mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue";

interface PlayerRow {
  id: string;
  firstName: string;
  lastName: string;
}

interface TeamGroup {
  id: string;
  name: string;
  level: number;
}

interface AssignmentRow {
  playerId: string;
  groupId: string;
  player: { id: string; firstName: string; lastName: string };
  group: { id: string; name: string; level: number };
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekStartMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

export default function TeamAssignmentsPage() {
  const params = useParams();
  const teamId = (params?.id as string) ?? "";
  const [weekStart, setWeekStart] = useState(() => weekStartMonday(new Date()));
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const weekKey =
    normalizeWeekStartDateParam(ymd(weekStart)) ?? ymd(weekStart);

  const groupByPlayer = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of assignments) {
      m.set(a.playerId, a.groupId);
    }
    return m;
  }, [assignments]);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const [pRes, gRes, aRes] = await Promise.all([
        fetch(`/api/players?teamId=${encodeURIComponent(teamId)}`),
        fetch(`/api/groups?teamId=${encodeURIComponent(teamId)}`),
        fetch(
          `/api/groups/assignments?teamId=${encodeURIComponent(teamId)}&weekStartDate=${encodeURIComponent(weekKey)}`
        ),
      ]);
      const pData = await pRes.json().catch(() => null);
      const gData = await gRes.json().catch(() => null);
      const aData = await aRes.json().catch(() => null);
      if (!pRes.ok) {
        setPlayers([]);
      } else {
        const list = Array.isArray(pData) ? pData : pData?.data;
        setPlayers(Array.isArray(list) ? list : []);
      }
      if (!gRes.ok) {
        setGroups([]);
      } else {
        setGroups(Array.isArray(gData) ? gData : []);
      }
      if (!aRes.ok) {
        setError(typeof aData?.error === "string" ? aData.error : null);
        setAssignments([]);
      } else {
        setAssignments(Array.isArray(aData) ? aData : []);
      }
    } catch {
      setError("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, [teamId, weekKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const assign = async (playerId: string, groupId: string) => {
    if (!groupId) return;
    setSavingId(playerId);
    try {
      const res = await fetch("/api/groups/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          groupId,
          weekStartDate: weekKey,
        }),
      });
      if (res.ok) await load();
    } finally {
      setSavingId(null);
    }
  };

  if (!teamId) {
    return <div className="p-8 text-slate-400">Некорректная команда</div>;
  }

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <Link
        href={`/teams/${teamId}/schedule`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-neon-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Расписание
      </Link>

      <h1 className="mb-4 font-display text-2xl text-white">
        Распределение по группам
      </h1>
      <p className="mb-6 text-sm text-slate-400">
        Назначение группы на календарную неделю (понедельник — воскресенье).
      </p>

      <div className="mb-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => {
            const p = new Date(weekStart);
            p.setDate(p.getDate() - 7);
            setWeekStart(weekStartMonday(p));
          }}
          className="rounded-lg border border-white/10 p-2 text-neon-blue hover:bg-white/5"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-neon-cyan" />
          <span className="text-white">Неделя с {weekKey}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            const n = new Date(weekStart);
            n.setDate(n.getDate() + 7);
            setWeekStart(weekStartMonday(n));
          }}
          className="rounded-lg border border-white/10 p-2 text-neon-blue hover:bg-white/5"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {groups.length === 0 && !loading && (
        <Card className="mb-6 border-amber-500/30 text-amber-200">
          Сначала создайте группы на странице{" "}
          <Link href={`/teams/${teamId}/groups`} className="underline">
            Группы
          </Link>
          .
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-500/30 text-red-300">{error}</Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
        </div>
      ) : players.length === 0 ? (
        <Card className="border-white/10 py-10 text-center text-slate-400">
          В команде нет игроков.
        </Card>
      ) : (
        <ul className="space-y-2">
          {players.map((p) => {
            const current = groupByPlayer.get(p.id) ?? "";
            return (
              <Card key={p.id} className="border-white/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-white">
                    {p.lastName} {p.firstName}
                  </p>
                  <div className="flex items-center gap-2 sm:w-64">
                    <select
                      className={SELECT_CLASS}
                      value={current}
                      disabled={savingId === p.id || groups.length === 0}
                      onChange={(e) => assign(p.id, e.target.value)}
                    >
                      <option value="">— группа —</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    {savingId === p.id && (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-neon-blue" />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}

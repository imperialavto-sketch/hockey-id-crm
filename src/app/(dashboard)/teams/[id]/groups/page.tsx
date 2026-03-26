"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

const INPUT_CLASS =
  "mt-1 w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue";

interface TeamGroup {
  id: string;
  name: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
}

export default function TeamGroupsPage() {
  const params = useParams();
  const teamId = (params?.id as string) ?? "";
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("A");
  const [newLevel, setNewLevel] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState(1);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups?teamId=${encodeURIComponent(teamId)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Ошибка");
        setGroups([]);
      } else {
        setGroups(Array.isArray(data) ? data : []);
      }
    } catch {
      setError("Сеть недоступна");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          name: newName.trim(),
          level: newLevel,
        }),
      });
      if (res.ok) {
        setNewName("");
        await load();
      }
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), level: editLevel }),
      });
      if (res.ok) {
        setEditingId(null);
        await load();
      }
    } catch {
      /* ignore */
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Скрыть группу? (мягкое удаление)")) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } catch {
      /* ignore */
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

      <h1 className="mb-6 font-display text-2xl text-white">Группы команды</h1>

      <Card className="mb-8 border-neon-blue/20 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neon-cyan">
          <Plus className="h-4 w-4" />
          Создать группу
        </h2>
        <form onSubmit={createGroup} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[120px] flex-1">
            <label className="text-xs text-slate-400">Название</label>
            <input
              className={INPUT_CLASS}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="A, B, Сильные…"
            />
          </div>
          <div className="w-24">
            <label className="text-xs text-slate-400">Уровень</label>
            <input
              type="number"
              min={1}
              className={INPUT_CLASS}
              value={newLevel}
              onChange={(e) => setNewLevel(Number(e.target.value) || 1)}
            />
          </div>
          <Button type="submit" size="sm" disabled={creating}>
            {creating ? "…" : "Добавить"}
          </Button>
        </form>
      </Card>

      {error && (
        <Card className="mb-6 border-red-500/30 text-red-300">{error}</Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-white/10 py-10 text-center text-slate-400">
          Групп пока нет. Создайте A / B / C для планирования.
        </Card>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => (
            <Card key={g.id} className="border-white/10 p-4">
              {editingId === g.id ? (
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    className={INPUT_CLASS + " flex-1 min-w-[140px]"}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    type="number"
                    min={1}
                    className={INPUT_CLASS + " w-20"}
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value) || 1)}
                  />
                  <Button size="sm" onClick={() => saveEdit(g.id)}>
                    OK
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{g.name}</p>
                    <p className="text-xs text-slate-500">
                      Уровень {g.level} · порядок {g.sortOrder}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-neon-blue"
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.name);
                        setEditLevel(g.level);
                      }}
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-red-400"
                      onClick={() => remove(g.id)}
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

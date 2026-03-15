"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, ExternalLink, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/Button";
import { usePermissions } from "@/hooks/usePermissions";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  birthDate?: string | null;
  position?: string;
  team?: { name: string; ageGroup?: string; coach?: { firstName: string; lastName: string } | null } | null;
  status?: string;
}

interface Team {
  id: string;
  name: string;
  ageGroup?: string;
}

const AGE_GROUPS = ["10-12 лет", "12-14 лет", "14-16 лет", "16-18 лет", "8-10 лет", "6-8 лет"];

export default function PlayersPage() {
  const { canCreate, canEdit } = usePermissions();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => (Array.isArray(d) ? d : d?.teams ?? []))
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (teamId) params.set("teamId", teamId);
    if (ageGroup) params.set("ageGroup", ageGroup);
    if (position) params.set("position", position);
    if (status) params.set("status", status);
    const t = setTimeout(() => {
      fetch(`/api/players?${params}`)
        .then((r) => r.json().catch(() => []))
        .then((data) => {
          if (Array.isArray(data)) return data;
          if (data?.data) return data.data;
          if (data?.players) return data.players;
          return [];
        })
        .then(setPlayers)
        .catch(() => setPlayers([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [search, teamId, ageGroup, position, status]);

  const safePlayers = Array.isArray(players) ? players : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Игроки
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            База игроков хоккейной школы
          </p>
        </div>
        {canCreate("players") && (
          <Link href="/players/new">
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Добавить игрока
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Поиск по ФИО..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
          />
        </div>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none"
        >
          <option value="">Все команды</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none"
        >
          <option value="">Все возраста</option>
          {AGE_GROUPS.map((ag) => (
            <option key={ag} value={ag}>{ag}</option>
          ))}
        </select>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none"
        >
          <option value="">Все позиции</option>
          <option value="Нападающий">Нападающий</option>
          <option value="Защитник">Защитник</option>
          <option value="Вратарь">Вратарь</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none"
        >
          <option value="">Все статусы</option>
          <option value="Активен">Активен</option>
          <option value="На паузе">На паузе</option>
          <option value="Травма">Травма</option>
          <option value="Выпускник">Выпускник</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
        </div>
      ) : safePlayers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center">
          <p className="text-lg font-medium text-slate-300">
            {search || teamId || ageGroup || position || status ? "Ничего не найдено" : "Пока нет игроков"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {search || teamId || ageGroup || position || status ? "Измените фильтры" : "Добавьте первого игрока"}
          </p>
          {!search && !teamId && !ageGroup && !position && !status && canCreate("players") && (
            <Link href="/players/new" className="mt-6 inline-block">
              <Button>+ Добавить игрока</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Имя</th>
                  <th className="px-4 py-3 font-medium">Возраст</th>
                  <th className="px-4 py-3 font-medium">Команда</th>
                  <th className="px-4 py-3 font-medium">Позиция</th>
                  <th className="px-4 py-3 font-medium">Тренер</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {safePlayers.map((player) => {
                  const birthDate = player.birthDate ? new Date(player.birthDate) : null;
                  const age = birthDate
                    ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : player.birthYear
                      ? new Date().getFullYear() - player.birthYear
                      : null;
                  const coachName = player.team?.coach
                    ? `${player.team.coach.firstName} ${player.team.coach.lastName}`
                    : "—";
                  return (
                    <tr
                      key={player.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/players/${player.id}`} className="font-medium text-white hover:text-neon-blue">
                          {player.firstName} {player.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{age != null ? `${age} лет` : player.birthYear ? `${player.birthYear} г.р.` : "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{player.team?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{player.position ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">{coachName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            player.status === "Активен"
                              ? "bg-neon-green/20 text-neon-green border border-neon-green/30"
                              : "bg-white/10 text-slate-400 border border-white/10"
                          }`}
                        >
                          {player.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/players/${player.id}`}>
                            <Button variant="secondary" size="sm" className="gap-1">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Открыть
                            </Button>
                          </Link>
                          <Link href={`/player/${player.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              Паспорт
                            </Button>
                          </Link>
                          {canEdit("players") && (
                            <Link href={`/players/${player.id}/edit`}>
                              <Button size="sm" className="gap-1">
                                <Pencil className="h-3.5 w-3.5" />
                                Редактировать
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

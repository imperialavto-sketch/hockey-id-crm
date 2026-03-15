"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/Button";
import { TeamCard } from "@/components/TeamCard";
import { usePermissions } from "@/hooks/usePermissions";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
  school?: { name: string } | null;
  coach?: { firstName: string; lastName: string } | null;
  _count?: { players: number; trainings: number };
}

export default function TeamsPage() {
  const { canCreate } = usePermissions();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ageGroup, setAgeGroup] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (ageGroup) params.set("ageGroup", ageGroup);
    fetch(`/api/teams?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) return data;
        if (data?.teams) return data.teams;
        if (data?.data) return data.data;
        return [];
      })
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, [search, ageGroup]);

  const safeTeams = Array.isArray(teams) ? teams : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Команды
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Управление командами школы
          </p>
        </div>
        {canCreate("teams") && (
          <Link href="/teams/new">
            <Button className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              Создать команду
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
          />
        </div>
        <select
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none"
        >
          <option value="">Все возрастные группы</option>
          <option value="10-12 лет">10-12 лет</option>
          <option value="12-14 лет">12-14 лет</option>
          <option value="14-16 лет">14-16 лет</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
        </div>
      ) : safeTeams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center">
          <p className="text-lg font-medium text-slate-300">
            {search || ageGroup ? "Ничего не найдено" : "Пока нет команд"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {search || ageGroup ? "Измените фильтры" : "Добавьте первую команду"}
          </p>
          {!search && !ageGroup && (
            <Link href="/teams/new" className="mt-6 inline-block">
              <Button>+ Создать команду</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {safeTeams.map((t) => (
            <TeamCard
              key={t.id}
              id={t.id}
              name={t.name}
              ageGroup={t.ageGroup}
              school={t.school?.name}
              coach={t.coach}
              playersCount={t._count?.players}
              trainingsCount={t._count?.trainings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

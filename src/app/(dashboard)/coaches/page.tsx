"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";
import { Plus, Search, Filter, GraduationCap, Users, Calendar } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  photoUrl?: string | null;
  teams: unknown[];
  trainingsCount?: number;
}

export default function CoachesPage() {
  const { canCreate } = usePermissions();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [teamId, setTeamId] = useState("");

  const fetchData = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (specialization) params.set("specialization", specialization);
    if (teamId) params.set("teamId", teamId);
    Promise.all([
      fetch(`/api/coaches?${params}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([data, teamsData]) => {
        setCoaches(Array.isArray(data) ? data : []);
        setTeams(Array.isArray(teamsData) ? teamsData : teamsData?.teams ?? []);
      })
      .catch(() => setCoaches([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [search, specialization, teamId]);

  const safeCoaches = Array.isArray(coaches) ? coaches : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Тренеры
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            База тренеров, оценки и журнал тренировок
          </p>
        </div>
        {canCreate("coaches") && (
          <Link href="/coaches/new" className="shrink-0">
            <Button className="gap-2 whitespace-nowrap">
              <Plus className="h-4 w-4 shrink-0" />
              Добавить тренера
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-5 w-5 text-neon-blue" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Поиск по ФИО..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-xl border border-white/20 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500"
          />
        </div>
        <input
          type="text"
          placeholder="Специализация"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          className="w-44 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500"
        />
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
        >
          <option value="">Все команды</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={fetchData}>
          Применить
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
        </div>
      ) : safeCoaches.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-slate-500">
            {search || specialization || teamId ? "Ничего не найдено" : "Пока нет тренеров"}
          </p>
          {!search && !specialization && !teamId && canCreate("coaches") && (
            <div className="flex justify-center pb-6">
              <Link href="/coaches/new">
                <Button>+ Добавить тренера</Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {safeCoaches.map((coach) => (
            <Link key={coach.id} href={`/coaches/${coach.id}`}>
              <Card className="group h-full transition-all hover:border-neon-blue/40 hover:shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-neon-pink/30 to-neon-purple/30">
                    {coach.photoUrl ? (
                      <img
                        src={coach.photoUrl}
                        alt={`${coach.firstName} ${coach.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="h-8 w-8 text-neon-blue" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-white">
                      {coach.firstName} {coach.lastName}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-400 line-clamp-1">
                      {coach.specialization ?? "Тренер"}
                    </p>
                    {coach.email && (
                      <p className="mt-1 truncate text-xs text-slate-500">{coach.email}</p>
                    )}
                    {(coach.phone || Array.isArray(coach.teams)) && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {coach.phone && <span>{coach.phone}</span>}
                        {Array.isArray(coach.teams) && coach.teams.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {coach.teams.length} команд
                          </span>
                        )}
                        {coach.trainingsCount != null && coach.trainingsCount > 0 && (
                          <span className="flex items-center gap-1 text-neon-cyan">
                            <Calendar className="h-3.5 w-3.5" />
                            {coach.trainingsCount} занятий
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="secondary" size="sm" className="w-full">
                    Открыть карточку
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

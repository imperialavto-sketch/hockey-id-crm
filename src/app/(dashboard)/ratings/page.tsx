"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Medal, Users, Loader2 } from "lucide-react";
import { Card } from "@/components/Card";

interface RatingItem {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
  position: string;
  birthYear: number;
  rankingScore: number;
  developmentIndex: number;
  attendanceScore: number;
  coachRatingScore: number;
}

interface Team {
  id: string;
  name: string;
  ageGroup?: string;
}

const POSITIONS = ["Нападающий", "Защитник", "Вратарь", "Центр", "Центральный нападающий"];

function getRankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export default function RatingsPage() {
  const [items, setItems] = useState<RatingItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState("");
  const [position, setPosition] = useState("");
  const [birthYear, setBirthYear] = useState("");

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
    if (teamId) params.set("teamId", teamId);
    if (position) params.set("position", position);
    if (birthYear) params.set("birthYear", birthYear);
    fetch(`/api/ratings?${params}`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [teamId, position, birthYear]);

  const birthYears = Array.from({ length: 18 }, (_, k) => 2016 - k);

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
          Рейтинг игроков
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
          <Trophy className="h-4 w-4 text-neon-blue" />
          Лидерборд на основе AI Development Index, статистики, посещаемости и достижений
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="rounded-xl border border-white/20 bg-dark-800 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
        >
          <option value="">Все команды</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-xl border border-white/20 bg-dark-800 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
        >
          <option value="">Все позиции</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          className="rounded-xl border border-white/20 bg-dark-800 px-4 py-2.5 text-sm text-white focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
        >
          <option value="">Все года рождения</option>
          {birthYears.map((y) => (
            <option key={y} value={y}>
              {y} г.р.
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden border-neon-blue/20 bg-gradient-to-br from-dark-800 to-dark-900">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Medal className="h-5 w-5 text-neon-blue" />
            Таблица рейтинга
          </h2>
        </div>
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-slate-500">
            <Users className="h-12 w-12" />
            <p>Нет данных для отображения</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium">Место</th>
                  <th className="px-6 py-4 font-medium">Имя</th>
                  <th className="px-6 py-4 font-medium">Команда</th>
                  <th className="px-6 py-4 font-medium">Возраст</th>
                  <th className="px-6 py-4 font-medium">Позиция</th>
                  <th className="px-6 py-4 font-medium text-right">Рейтинг</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const rank = idx + 1;
                  const badge = getRankBadge(rank);
                  return (
                    <tr
                      key={item.id}
                      className="group border-b border-white/5 transition-colors hover:bg-neon-blue/5"
                    >
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 font-display font-semibold">
                          {badge ?? (
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-400 group-hover:bg-neon-blue/20 group-hover:text-neon-blue">
                              {rank}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/player/${item.id}`}
                          className="font-medium text-white transition-colors hover:text-neon-blue"
                        >
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {item.team?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{item.birthYear} г.р.</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-neon-blue/30 bg-neon-blue/10 px-2.5 py-1 text-xs font-medium text-neon-blue">
                          {item.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono text-lg font-bold text-neon-cyan">
                          {item.rankingScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

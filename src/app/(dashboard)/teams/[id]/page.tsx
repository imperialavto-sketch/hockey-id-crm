"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  Users,
  BarChart3,
  UserCircle,
  MapPin,
  Clock,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface Team {
  id: string;
  name: string;
  ageGroup: string;
  school?: { id: string; name: string } | null;
  coach?: { id: string; firstName: string; lastName: string } | null;
  players?: Player[];
  trainings?: Training[];
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  position?: string;
  status?: string;
  photoUrl?: string | null;
}

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  attendances?: { status: string; player: { id: string } }[];
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) ?? "";
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/teams/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error || !data?.id) setTeam(null);
        else setTeam(data);
      })
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Удалить команду?")) return;
    const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/teams");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <p className="text-slate-400">Команда не найдена</p>
        <Link href="/teams" className="text-neon-blue hover:underline">
          ← Назад к командам
        </Link>
      </div>
    );
  }

  const players = Array.isArray(team.players) ? team.players : [];
  const trainings = Array.isArray(team.trainings) ? team.trainings : [];
  const presentByTraining = trainings.map((t) => ({
    id: t.id,
    present: (t.attendances ?? []).filter((a) => a.status === "PRESENT").length,
  }));
  const avgAttendance =
    trainings.length > 0
      ? Math.round(
          (presentByTraining.reduce((s, x) => s + x.present, 0) /
            (trainings.length * Math.max(1, players.length))) *
            100
        )
      : 0;

  const thisMonth = new Date().getMonth();
  const trainingsThisMonth = trainings.filter(
    (t) => new Date(t.startTime).getMonth() === thisMonth
  ).length;

  return (
    <div className="min-h-screen p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к командам
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/teams/${id}/edit`}>
            <Button variant="secondary" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" />
              Редактировать
            </Button>
          </Link>
          <Link href={`/trainings/new?teamId=${id}`}>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Тренировка
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={handleDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Удалить
          </Button>
        </div>
      </div>

      {/* A. Основная информация */}
      <Card className="mb-8 border-neon-blue/30 shadow-[0_0_40px_rgba(0,212,255,0.1)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-neon-blue/40 bg-gradient-to-br from-neon-blue/20 to-neon-cyan/20">
            <Users className="h-12 w-12 text-neon-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
              {team.name}
            </h1>
            <p className="mt-1 text-slate-400">{team.ageGroup}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {team.school?.name ?? "—"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Главный тренер:{" "}
              {team.coach
                ? `${team.coach.firstName} ${team.coach.lastName}`
                : "не назначен"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {players.length} игроков
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* B. Состав команды */}
        <Card className="border-neon-blue/20">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Users className="h-5 w-5 text-neon-blue" />
            Состав команды
          </h2>
          {players.length > 0 ? (
            <div className="space-y-2">
              {players.map((p) => (
                <Link key={p.id} href={`/players/${p.id}`}>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-neon-blue/30 hover:bg-neon-blue/5">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neon-blue/10">
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={`${p.firstName} ${p.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserCircle className="h-6 w-6 text-neon-blue/70" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {p.birthYear ? `${p.birthYear} г.р.` : ""}{" "}
                        {p.position ?? ""} {p.status ? `• ${p.status}` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Игроков нет</p>
          )}
        </Card>

        {/* E. Командная статистика */}
        <Card className="border-neon-green/20">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-neon-green" />
            Командная статистика
          </h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs text-slate-500">Игроков</dt>
              <dd className="mt-1 text-2xl font-bold text-neon-blue">
                {players.length}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs text-slate-500">Посещаемость</dt>
              <dd className="mt-1 text-2xl font-bold text-neon-green">
                {avgAttendance}%
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs text-slate-500">Тренировок в месяце</dt>
              <dd className="mt-1 text-2xl font-bold text-neon-cyan">
                {trainingsThisMonth}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs text-slate-500">Всего тренировок</dt>
              <dd className="mt-1 text-2xl font-bold text-white">
                {trainings.length}
              </dd>
            </div>
          </dl>
        </Card>

        {/* C. Расписание команды */}
        <Card className="border-neon-blue/20 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Calendar className="h-5 w-5 text-neon-blue" />
            Расписание команды
          </h2>
          {trainings.length > 0 ? (
            <div className="space-y-2">
              {trainings.slice(0, 15).map((t) => {
                const start = new Date(t.startTime);
                const end = new Date(t.endTime);
                const present = (t.attendances ?? []).filter(
                  (a) => a.status === "PRESENT"
                ).length;
                return (
                  <Link key={t.id} href={`/trainings/${t.id}`}>
                    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-neon-blue/30">
                      <div className="rounded-lg bg-neon-blue/20 p-2">
                        <Calendar className="h-5 w-5 text-neon-blue" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{t.title}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {start.toLocaleDateString("ru-RU")}{" "}
                            {start.toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            –
                            {end.toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {t.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {t.location}
                            </span>
                          )}
                        </div>
                        {t.notes && (
                          <p className="mt-1 text-xs text-slate-500">{t.notes}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-neon-green/20 px-3 py-1 text-sm text-neon-green">
                        {present}/{players.length}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500">Тренировок нет</p>
          )}
        </Card>

        {/* D. Посещаемость по команде (сводка) */}
        <Card className="border-neon-cyan/20 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Users className="h-5 w-5 text-neon-cyan" />
            Посещаемость по тренировкам
          </h2>
          {trainings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-500">
                    <th className="py-2 pr-4">Тренировка</th>
                    <th className="py-2 pr-4">Дата</th>
                    <th className="py-2">Присутствовало</th>
                  </tr>
                </thead>
                <tbody>
                  {trainings.slice(0, 10).map((t) => {
                    const present = (t.attendances ?? []).filter(
                      (a) => a.status === "PRESENT"
                    ).length;
                    const absent = players.length - present;
                    return (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="py-3 pr-4 font-medium text-white">
                          {t.title}
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {new Date(t.startTime).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="py-3">
                          <span className="text-neon-green">{present}</span>
                          <span className="text-slate-500"> / </span>
                          <span className="text-slate-400">{players.length}</span>
                          {absent > 0 && (
                            <span className="ml-2 text-slate-500">
                              ({absent} отсутствовало)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500">Нет данных</p>
          )}
        </Card>
      </div>
    </div>
  );
}

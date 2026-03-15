"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Building2, Users, ArrowLeft } from "lucide-react";
import { Card } from "@/components/Card";

interface School {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface Team {
  id: string;
  name: string;
  ageGroup: string;
  _count?: { players: number };
}

export default function SchoolDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";

  const [school, setSchool] = useState<School | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/schools/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error || !data?.id) {
          setSchool(null);
          setTeams([]);
          return;
        }
        setSchool(data);
        setTeams(Array.isArray(data.teams) ? data.teams : []);
      })
      .catch(() => {
        setSchool(null);
        setTeams([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ice-500 border-t-transparent" />
      </div>
    );
  }

  if (!school || school.id !== id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <p className="text-slate-400">Школа не найдена</p>
        <Link href="/schools" className="text-sm text-ice-400 hover:text-ice-300">
          ← Назад к школам
        </Link>
      </div>
    );
  }

  const safeTeams = Array.isArray(teams) ? teams : [];

  return (
    <div className="p-8">
      <Link
        href="/schools"
        className="mb-6 inline-flex items-center text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к школам
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white">
          {school.name}
        </h1>
        <div className="mt-2 flex flex-wrap gap-4 text-slate-400">
          {school.address && <span>{school.address}</span>}
          {school.phone && <span>{school.phone}</span>}
          {school.email && <span>{school.email}</span>}
        </div>
      </div>

      <h2 className="mb-4 font-display text-lg font-semibold text-white">
        Команды
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {safeTeams.map((t) => (
          <Link key={t.id} href={`/teams/${t.id}`}>
            <Card className="transition-all hover:border-ice-500/30">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-ice-500/10 p-3">
                  <Users className="h-6 w-6 text-ice-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{t.name}</h3>
                  <p className="text-sm text-slate-400">
                    {t.ageGroup} • {t._count?.players ?? 0} игроков
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {safeTeams.length === 0 && (
        <Card>
          <p className="text-slate-400">Команды не найдены</p>
          <p className="mt-1 text-sm text-slate-500">
            Для этой школы пока нет команд
          </p>
        </Card>
      )}
    </div>
  );
}

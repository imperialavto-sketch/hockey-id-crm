"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  team?: { name: string; ageGroup: string } | null;
}

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trainings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.trainings)) return data.trainings;
        return [];
      })
      .then(setTrainings)
      .catch(() => setTrainings([]))
      .finally(() => setLoading(false));
  }, []);

  const safeTrainings = Array.isArray(trainings) ? trainings : [];

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Тренировки
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Расписание и посещаемость тренировок
          </p>
        </div>
        <Link href="/trainings/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            + Добавить тренировку
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
        </div>
      ) : safeTrainings.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-500" />
          <p className="mt-4 text-lg text-slate-400">
            Тренировки пока не добавлены
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Добавьте первую тренировку, чтобы начать
          </p>
          <Link href="/trainings/new" className="mt-6 inline-block">
            <Button>+ Добавить тренировку</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {safeTrainings.map((t) => (
            <Link key={t.id} href={`/trainings/${t.id}`}>
              <Card className="transition-all hover:border-neon-blue/40">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-neon-blue/10 p-3">
                    <Calendar className="h-8 w-8 text-neon-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display font-semibold text-white">
                      {t.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {t.team?.name ?? "—"} ({t.team?.ageGroup ?? ""})
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t.startTime
                        ? new Date(t.startTime).toLocaleString("ru-RU")
                        : "—"}
                      {t.location ? ` • ${t.location}` : ""}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

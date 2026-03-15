"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface School {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  _count?: { teams: number; players: number };
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    fetch("/api/schools")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.schools)) return data.schools;
        return [];
      })
      .then(setSchools)
      .catch(() => setSchools([]));
  }, []);

  const safeSchools = Array.isArray(schools) ? schools : [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Школы</h1>
          <p className="mt-1 text-slate-400">
            Управление хоккейными школами и их регистрацией
          </p>
        </div>
        <Link href="/schools/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            + Добавить школу
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {safeSchools.map((s) => (
          <Link key={s.id} href={`/schools/${s.id}`}>
            <Card className="transition-all hover:border-ice-500/30">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-ice-500/10 p-3">
                  <Building2 className="h-8 w-8 text-ice-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-semibold text-white truncate">
                    {s.name}
                  </h2>
                  {s.address && (
                    <p className="mt-1 text-sm text-slate-400 truncate">
                      {s.address}
                    </p>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    <span>{s._count?.teams ?? 0} команд</span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {safeSchools.length === 0 && (
        <Card className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-slate-400">Школ пока нет</p>
          <Link href="/schools/new" className="mt-4 inline-block">
            <Button>+ Добавить школу</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

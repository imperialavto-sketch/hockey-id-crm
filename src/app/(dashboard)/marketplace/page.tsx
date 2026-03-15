"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Store, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { usePermissions } from "@/hooks/usePermissions";

interface MarketplaceCoach {
  id: string;
  fullName: string;
  slug: string;
  city: string;
  specialties: string[];
  experienceYears: number;
  priceFrom: number;
  rating?: number | null;
  isPublished: boolean;
  servicesCount: number;
}

export default function MarketplacePage() {
  const { canCreate } = usePermissions();
  const [coaches, setCoaches] = useState<MarketplaceCoach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/marketplace/coaches", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCoaches(Array.isArray(data) ? data : []))
      .catch(() => setCoaches([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-neon-blue/20 p-2 border border-neon-blue/40">
            <Store className="h-6 w-6 text-neon-blue" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Маркетплейс тренеров
            </h1>
            <p className="text-sm text-slate-400">
              Тренеры и подкатки для родителей
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/marketplace/requests">
            <Button variant="secondary" className="gap-2">
              <FileText className="h-4 w-4" />
              Заявки
            </Button>
          </Link>
          {canCreate("marketplace") && (
            <Link href="/marketplace/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Добавить тренера
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
        </div>
      ) : coaches.length === 0 ? (
        <Card className="border-neon-blue/20 bg-white/5">
          <p className="py-12 text-center text-slate-500">
            Пока нет тренеров в маркетплейсе. Добавьте первого тренера или
            выполните seed.
          </p>
          {canCreate("marketplace") && (
            <div className="flex justify-center pb-6">
              <Link href="/marketplace/new">
                <Button>+ Добавить тренера</Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <Card className="border-neon-blue/20 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-slate-400">
                  <th className="pb-3 pr-4">Тренер</th>
                  <th className="pb-3 pr-4">Город</th>
                  <th className="pb-3 pr-4">Специализации</th>
                  <th className="pb-3 pr-4">Опыт / Цена</th>
                  <th className="pb-3 pr-4">Статус</th>
                  <th className="pb-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 text-sm text-white"
                  >
                    <td className="py-4 pr-4 font-medium">{c.fullName}</td>
                    <td className="py-4 pr-4">{c.city}</td>
                    <td className="py-4 pr-4">
                      {(c.specialties ?? []).slice(0, 3).join(", ")}
                    </td>
                    <td className="py-4 pr-4">
                      {c.experienceYears} лет / от {c.priceFrom} ₽
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={
                          c.isPublished
                            ? "text-emerald-500"
                            : "text-amber-500"
                        }
                      >
                        {c.isPublished ? "Опубликован" : "Черновик"}
                      </span>
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/marketplace/coaches/${c.id}`}
                        className="text-neon-blue hover:underline"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

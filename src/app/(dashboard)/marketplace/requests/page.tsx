"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface BookingRequest {
  id: string;
  coachId: string;
  coachName: string;
  coachCity: string;
  parentName: string;
  parentPhone: string;
  playerId?: string | null;
  message: string;
  preferredDate: string | null;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  confirmed: "Подтверждена",
  declined: "Отклонена",
};

export default function MarketplaceRequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = () => {
    const params = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/admin/marketplace/booking-requests${params}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/marketplace/booking-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) load();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-neon-blue/20 p-2 border border-neon-blue/40">
          <FileText className="h-6 w-6 text-neon-blue" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Заявки на занятия
          </h1>
          <p className="text-sm text-slate-400">
            Входящие запросы от родителей
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-neon-blue" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-neon-blue/20 bg-white/5">
          <p className="py-12 text-center text-slate-500">
            Заявок пока нет
          </p>
        </Card>
      ) : (
        <Card className="border-neon-blue/20 bg-white/5">
          <div className="divide-y divide-white/5">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-4 py-6 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{r.parentName}</span>
                    <span className="text-slate-500">•</span>
                    <a
                      href={`tel:${r.parentPhone}`}
                      className="text-neon-blue hover:underline"
                    >
                      {r.parentPhone}
                    </a>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Тренер: {r.coachName} ({r.coachCity})
                  </p>
                  {r.message && (
                    <p className="mt-2 text-sm text-slate-300">{r.message}</p>
                  )}
                  {r.preferredDate && (
                    <p className="mt-1 text-xs text-slate-500">
                      Желаемая дата:{" "}
                      {new Date(r.preferredDate).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-600">
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span
                    className={`rounded-lg px-3 py-1 text-sm ${
                      r.status === "confirmed"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : r.status === "declined"
                          ? "bg-amber-500/20 text-amber-400"
                          : r.status === "in_progress"
                            ? "bg-neon-blue/20 text-neon-blue"
                            : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                  {r.status === "new" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatus(r.id, "in_progress")}
                      >
                        В работу
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(r.id, "confirmed")}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatus(r.id, "declined")}
                      >
                        Отклонить
                      </Button>
                    </div>
                  )}
                  {r.status === "in_progress" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(r.id, "confirmed")}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatus(r.id, "declined")}
                      >
                        Отклонить
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

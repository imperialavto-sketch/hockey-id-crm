"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  UserCircle,
  MapPin,
  Clock,
  Users,
  Check,
  X,
  HeartPulse,
  Loader2,
  User,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { usePermissions } from "@/hooks/usePermissions";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface Training {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  team?: {
    id: string;
    name: string;
    ageGroup: string;
    coach?: { id: string; firstName?: string; lastName?: string } | null;
  } | null;
}

interface Attendance {
  playerId: string;
  status: AttendanceStatus;
  comment?: string | null;
  player?: { id: string; firstName: string; lastName: string } | null;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: typeof Check; className: string }> = {
  PRESENT: {
    label: "Присутствовал",
    icon: Check,
    className: "border-neon-green/40 bg-neon-green/20 text-neon-green hover:bg-neon-green/30",
  },
  ABSENT: {
    label: "Отсутствовал",
    icon: X,
    className: "border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30",
  },
  EXCUSED: {
    label: "Травма",
    icon: HeartPulse,
    className: "border-amber-500/40 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
  },
  LATE: {
    label: "Опоздал",
    icon: Clock,
    className: "border-neon-blue/40 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30",
  },
};

const QUICK_STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "EXCUSED"];

export default function TrainingDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const { canEdit } = usePermissions();
  const canEditTraining = canEdit("schedule");

  const [training, setTraining] = useState<Training | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetch(`/api/trainings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error || !data?.id) {
          setTraining(null);
          setPlayers([]);
          setAttendances([]);
          return;
        }
        setTraining(data);
        const atts = Array.isArray(data.attendances) ? data.attendances : [];
        setAttendances(atts);
        const attComments: Record<string, string> = {};
        atts.forEach((a: { playerId: string; comment?: string }) => {
          if (a.comment) attComments[a.playerId] = a.comment;
        });
        setComments(attComments);
        if (data.team?.id) {
          return fetch(`/api/players?teamId=${data.team.id}`)
            .then((r) => r.json())
            .then(async (pl: unknown) => {
              const list = Array.isArray(pl) ? pl : [];
              setPlayers(list);
              if (data.team?.coach?.id) {
                try {
                  const ratingsRes = await fetch(`/api/coaches/${data.team.coach.id}/ratings`);
                  const ratingsList = await ratingsRes.json().catch(() => []);
                  const ratingsMap: Record<string, number> = {};
                  (Array.isArray(ratingsList) ? ratingsList : []).forEach(
                    (r: { playerId?: string; rating?: number }) => {
                      if (r?.playerId && r?.rating != null) ratingsMap[r.playerId] = r.rating;
                    }
                  );
                  setRatings(ratingsMap);
                } catch {
                  // ignore
                }
              }
            });
        }
      })
      .catch(() => {
        setTraining(null);
        setPlayers([]);
        setAttendances([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const getStatusForPlayer = (playerId: string): AttendanceStatus | "" => {
    const a = attendances.find((x) => String(x.playerId) === String(playerId));
    return a?.status ?? "";
  };

  const updateAttendance = async (
    playerId: string,
    status: AttendanceStatus,
    comment?: string
  ) => {
    if (!canEditTraining) return;
    setSaving(playerId);
    try {
      const res = await fetch(`/api/trainings/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          status,
          comment: comment ?? comments[playerId] ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data) {
        setAttendances((prev) => {
          const filtered = prev.filter((x) => String(x.playerId) !== String(playerId));
          return [...filtered, { playerId, status, comment, player: null }];
        });
      }
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const markAllPresent = async () => {
    if (!canEditTraining || players.length === 0) return;
    setSaving("bulk");
    try {
      const res = await fetch(`/api/trainings/${id}/attendance/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PRESENT" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const count = data?.updated ?? players.length;
        setAttendances((prev) => {
          const byPlayer = new Map(prev.map((a) => [String(a.playerId), a]));
          players.forEach((p) => byPlayer.set(p.id, { playerId: p.id, status: "PRESENT" as const, player: null }));
          return Array.from(byPlayer.values());
        });
      }
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const saveRating = async (playerId: string, rating: number, recommendation?: string) => {
    const coachId = training?.team?.coach?.id;
    if (!coachId || rating < 1 || rating > 5) return;
    setSaving(`rating-${playerId}`);
    try {
      const res = await fetch(`/api/player/${playerId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId,
          rating,
          recommendation: recommendation ?? comments[playerId] ?? "",
        }),
      });
      if (res.ok) {
        setRatings((prev) => ({ ...prev, [playerId]: rating }));
      }
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const coachName = training?.team?.coach
    ? [training.team.coach.firstName, training.team.coach.lastName].filter(Boolean).join(" ") || "Тренер"
    : null;

  const duration =
    training?.startTime && training?.endTime
      ? Math.round(
          (new Date(training.endTime).getTime() - new Date(training.startTime).getTime()) / 60000
        )
      : null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
      </div>
    );
  }

  if (!training) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <p className="text-slate-400">Тренировка не найдена</p>
        <Link href="/trainings" className="text-sm text-neon-blue hover:text-neon-blue/80">
          ← Назад к тренировкам
        </Link>
      </div>
    );
  }

  const safePlayers = Array.isArray(players) ? players : [];

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/schedule"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-neon-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к расписанию
      </Link>

      <Card className="mb-8 border-neon-blue/20">
        <div className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            {training.title}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 shrink-0" />
              {training.team?.name ?? "—"} ({training.team?.ageGroup ?? ""})
            </span>
            {coachName && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 shrink-0" />
                {coachName}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0" />
              {training.startTime
                ? new Date(training.startTime).toLocaleDateString("ru-RU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              {training.startTime
                ? new Date(training.startTime).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
              —
              {training.endTime
                ? new Date(training.endTime).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
              {duration != null && ` (${duration} мин)`}
            </span>
            {training.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {training.location}
              </span>
            )}
          </div>
          {training.notes && (
            <p className="text-sm text-slate-500">{training.notes}</p>
          )}
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-white">
          Посещаемость и оценки
        </h2>
        {canEditTraining && safePlayers.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllPresent}
            disabled={saving === "bulk"}
            className="gap-2"
          >
            {saving === "bulk" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Отметить всех присутствующими
          </Button>
        )}
      </div>

      <Card className="border-neon-blue/20 overflow-x-auto">
        {safePlayers.length === 0 ? (
          <p className="p-6 text-slate-400">В команде пока нет игроков</p>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-slate-400">
                <th className="p-4 font-medium">Игрок</th>
                <th className="p-4 font-medium">Статус</th>
                <th className="p-4 font-medium">Оценка</th>
                <th className="p-4 font-medium">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {safePlayers.map((p) => {
                const current = getStatusForPlayer(p.id);
                const rating = ratings[p.id] ?? 0;
                const isSaving =
                  saving === p.id || saving === `rating-${p.id}`;

                return (
                  <tr
                    key={p.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neon-blue/20">
                          <UserCircle className="h-4 w-4 text-neon-blue" />
                        </div>
                        <span className="font-medium text-white">
                          {p.firstName} {p.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {canEditTraining ? (
                        <div className="flex flex-wrap gap-1">
                          {QUICK_STATUSES.map((status) => {
                            const cfg = STATUS_CONFIG[status];
                            const Icon = cfg.icon;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  updateAttendance(p.id, status, comments[p.id])
                                }
                                disabled={isSaving}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50 ${cfg.className} ${
                                  current === status ? "ring-1 ring-offset-1 ring-offset-dark-900" : "opacity-80"
                                }`}
                                title={cfg.label}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {status === "PRESENT" ? "✓" : status === "ABSENT" ? "✕" : "🩹"}
                              </button>
                            );
                          })}
                          {current && (
                            <span className="ml-1 text-xs text-slate-500">
                              {STATUS_CONFIG[current]?.label ?? current}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          {current ? STATUS_CONFIG[current]?.label ?? current : "—"}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {training.team?.coach?.id && (
                        canEditTraining ? (
                          <select
                            value={rating || ""}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (!isNaN(v) && v >= 1 && v <= 5) {
                                setRatings((prev) => ({ ...prev, [p.id]: v }));
                                saveRating(p.id, v);
                              }
                            }}
                            disabled={isSaving}
                            className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-neon-blue focus:outline-none disabled:opacity-50"
                          >
                            <option value="">—</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n} ★
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">
                            {rating ? `${rating} ★` : "—"}
                          </span>
                        )
                      )}
                      {!training.team?.coach?.id && (
                        <span className="text-slate-500 text-xs">Нет тренера</span>
                      )}
                    </td>
                    <td className="p-4">
                      {canEditTraining ? (
                        <input
                          type="text"
                          placeholder="Комментарий"
                          value={comments[p.id] ?? ""}
                          onChange={(e) =>
                            setComments((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          onBlur={() => {
                            if (current) {
                              updateAttendance(p.id, current, comments[p.id]);
                            }
                            if (rating && training.team?.coach?.id) {
                              saveRating(p.id, rating, comments[p.id]);
                            }
                          }}
                          className="min-w-[140px] max-w-[220px] rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-neon-blue focus:outline-none"
                        />
                      ) : (
                        <span className="text-slate-400 text-sm">
                          {comments[p.id] || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
